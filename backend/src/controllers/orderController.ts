import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { Reschedule } from '../models/Reschedule';
import { PricingService } from '../services/pricingService';
import { AssignmentService } from '../services/assignmentService';
import { TrackingService } from '../services/trackingService';
import { NotificationService } from '../notifications/notificationService';
import { OrderStateMachine } from '../services/orderStateMachine';
import { AuditLogService } from '../services/auditLogService';
import { SocketManager } from '../sockets/socketManager';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../utils/apiResponse';
import { AppError } from '../middleware/errorHandler';
import { ERROR_CODES, DEFAULT_PAGE_SIZE } from '../constants';
import { OrderStatus, UserRole, AuditAction } from '../types';

export class OrderController {
  /**
   * Generates a shipping charge preview / quote before order placement.
   */
  static async getQuote(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const quote = await PricingService.calculateQuote(req.body);
      return ApiResponse.success(res, quote, 'Shipping quote calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Places a new delivery order with price calculation and auto-assignment.
   */
  static async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const user = req.user!;
      const {
        customerId,
        pickupAddress,
        dropAddress,
        orderType,
        paymentType,
        packageDimensions,
        actualWeight,
        scheduledDeliveryDate,
        notes,
        autoAssign = true
      } = req.body;

      // Determine target customer (Admin can create on behalf of customer)
      let targetCustomerId = user._id;
      if (user.role === UserRole.ADMIN && customerId) {
        const customer = await User.findById(customerId);
        if (!customer) {
          throw new AppError('Customer not found.', 404, ERROR_CODES.USER_NOT_FOUND);
        }
        targetCustomerId = customer._id;
      }

      // 1. Calculate authoritative pricing quote from backend engine
      const quote = await PricingService.calculateQuote({
        pickupPincode: pickupAddress.pincode,
        dropPincode: dropAddress.pincode,
        customerType: orderType,
        paymentType,
        dimensions: packageDimensions,
        actualWeight
      });

      // 2. Generate unique human-readable Order ID e.g. LM-592813
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const orderId = `LM-${randomSuffix}`;

      // 3. Create Order Document
      const order = await Order.create({
        orderId,
        customerId: targetCustomerId,
        createdBy: user._id,
        pickupAddress,
        dropAddress,
        pickupZone: quote.pickupZone,
        dropZone: quote.dropZone,
        orderType,
        paymentType,
        packageDimensions,
        actualWeight: quote.actualWeight,
        volumetricWeight: quote.volumetricWeight,
        chargeableWeight: quote.chargeableWeight,
        rateCardId: quote.rateCardId,
        baseCharge: quote.baseCharge,
        codSurcharge: quote.codSurcharge,
        totalCharge: quote.totalCharge,
        currency: quote.currency,
        status: OrderStatus.CREATED,
        scheduledDeliveryDate: scheduledDeliveryDate ? new Date(scheduledDeliveryDate) : new Date(),
        notes
      });

      // 4. Append initial CREATED tracking event (Immutable)
      await TrackingService.appendEvent({
        orderId: order.orderId,
        orderDocId: order._id as any,
        status: OrderStatus.CREATED,
        actorId: user._id,
        actorRole: user.role,
        actorName: user.name,
        note: `Shipment order created. Total charge: ${quote.currency} ${quote.totalCharge}`
      });

      // 5. Trigger Auto-Assignment if enabled
      let assignmentResult = null;
      if (autoAssign) {
        assignmentResult = await AssignmentService.autoAssign(order);
      }

      // 6. Record Audit Log
      await AuditLogService.record({
        actor: { _id: user._id, role: user.role, name: user.name, email: user.email },
        action: AuditAction.ORDER_CREATED,
        entityType: 'Order',
        entityId: order.orderId,
        newValue: { orderId: order.orderId, totalCharge: order.totalCharge, status: order.status }
      });

      // 7. Notify Customer
      await NotificationService.notifyOrderLifecycle(
        order,
        user.email,
        user.phone,
        'ORDER_CREATED',
        'Your shipment request has been confirmed and scheduled.'
      );

      // Broadcast to admin channel
      SocketManager.emitOrderCreated(order);

      return ApiResponse.created(
        res,
        {
          order,
          pricingBreakdown: quote,
          assignment: assignmentResult
        },
        'Order created successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves orders with pagination and filtering.
   * Customer: their own orders. Admin: all orders.
   */
  static async getOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const user = req.user!;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || DEFAULT_PAGE_SIZE));
      const skip = (page - 1) * limit;

      const query: any = {};

      if (user.role === UserRole.CUSTOMER) {
        query.customerId = user._id;
      }

      if (req.query.status) {
        query.status = req.query.status;
      }

      if (req.query.search) {
        const searchRegex = new RegExp(String(req.query.search).trim(), 'i');
        query.$or = [
          { orderId: searchRegex },
          { 'pickupAddress.city': searchRegex },
          { 'dropAddress.city': searchRegex },
          { 'pickupAddress.contactName': searchRegex },
          { 'dropAddress.contactName': searchRegex }
        ];
      }

      const [orders, total] = await Promise.all([
        Order.find(query)
          .populate('customerId', 'name email phone')
          .populate('assignedAgentId')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(query)
      ]);

      return ApiResponse.success(res, orders, 'Orders retrieved', 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves an order by ID with ownership authorization check.
   */
  static async getOrderById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const user = req.user!;
      const { id } = req.params;

      const order = await Order.findOne({
        $or: [{ orderId: id.toUpperCase() }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      })
        .populate('customerId', 'name email phone companyName')
        .populate('assignedAgentId');

      if (!order) {
        throw new AppError(`Order '${id}' not found.`, 404, ERROR_CODES.ORDER_NOT_FOUND);
      }

      // RBAC Ownership check: Customers can only view their own orders
      if (user.role === UserRole.CUSTOMER && order.customerId._id.toString() !== (user._id as any).toString()) {
        throw new AppError('Unauthorized: You do not have access to this order.', 403, ERROR_CODES.FORBIDDEN);
      }

      // Timeline
      const timeline = await TrackingService.getOrderTimeline(order._id as any);

      return ApiResponse.success(res, { order, timeline }, 'Order retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves chronological tracking events for an order.
   */
  static async getTracking(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const user = req.user!;
      const { id } = req.params;

      const order = await Order.findOne({
        $or: [{ orderId: id.toUpperCase() }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      }).populate('assignedAgentId');

      if (!order) {
        throw new AppError(`Order '${id}' not found.`, 404, ERROR_CODES.ORDER_NOT_FOUND);
      }

      if (user.role === UserRole.CUSTOMER && order.customerId.toString() !== (user._id as any).toString()) {
        throw new AppError('Unauthorized: You do not have access to this order.', 403, ERROR_CODES.FORBIDDEN);
      }

      const timeline = await TrackingService.getOrderTimeline(order._id as any);

      return ApiResponse.success(
        res,
        {
          orderId: order.orderId,
          status: order.status,
          assignedAgent: order.assignedAgentId,
          pickupAddress: order.pickupAddress,
          dropAddress: order.dropAddress,
          scheduledDeliveryDate: order.scheduledDeliveryDate,
          timeline
        },
        'Tracking history retrieved'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Customer / Admin Rescheduling for a Failed Order.
   */
  static async rescheduleOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { newDeliveryDate, reason } = req.body;

      const order = await Order.findOne({
        $or: [{ orderId: id.toUpperCase() }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      });

      if (!order) {
        throw new AppError(`Order '${id}' not found.`, 404, ERROR_CODES.ORDER_NOT_FOUND);
      }

      // Check ownership
      if (user.role === UserRole.CUSTOMER && order.customerId.toString() !== (user._id as any).toString()) {
        throw new AppError('Unauthorized to reschedule this order.', 403, ERROR_CODES.FORBIDDEN);
      }

      // Order must be in FAILED status to be rescheduled
      if (order.status !== OrderStatus.FAILED) {
        throw new AppError(
          `Only orders in FAILED status can be rescheduled. Current status is '${order.status}'.`,
          400,
          ERROR_CODES.RESCHEDULE_NOT_ALLOWED
        );
      }

      const newDate = new Date(newDeliveryDate);
      if (isNaN(newDate.getTime()) || newDate <= new Date()) {
        throw new AppError('New delivery date must be a valid future date/time.', 400, ERROR_CODES.INVALID_INPUT);
      }

      const previousDate = order.scheduledDeliveryDate;
      const previousAgent = order.assignedAgentId;

      // 1. Create Reschedule Record
      const rescheduleDoc = await Reschedule.create({
        orderId: order.orderId,
        orderDocId: order._id,
        previousDeliveryDate: previousDate,
        newDeliveryDate: newDate,
        requestedBy: user._id,
        reason,
        previousAgentId: previousAgent
      });

      // 2. Update Order status to RESCHEDULED
      order.status = OrderStatus.RESCHEDULED;
      order.scheduledDeliveryDate = newDate;
      order.failureReason = undefined;
      await order.save();

      // 3. Append Tracking Event
      await TrackingService.appendEvent({
        orderId: order.orderId,
        orderDocId: order._id as any,
        status: OrderStatus.RESCHEDULED,
        actorId: user._id,
        actorRole: user.role,
        actorName: user.name,
        note: `Rescheduled for ${newDate.toLocaleDateString()}. Reason: ${reason}`
      });

      // 4. Auto-Reassign Delivery Agent
      const assignmentResult = await AssignmentService.autoAssign(order);

      if (assignmentResult.success && assignmentResult.agent) {
        rescheduleDoc.reassignedAgentId = assignmentResult.agent._id as any;
        await rescheduleDoc.save();
      }

      // 5. Notify Customer
      const customer = await User.findById(order.customerId);
      if (customer) {
        await NotificationService.notifyOrderLifecycle(
          order,
          customer.email,
          customer.phone,
          'ORDER_RESCHEDULED',
          `Your delivery has been rescheduled to ${newDate.toLocaleString()}.`
        );
      }

      return ApiResponse.success(
        res,
        {
          order,
          reschedule: rescheduleDoc,
          reassignment: assignmentResult
        },
        'Order rescheduled successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel an order if allowed by status rules (CREATED or ASSIGNED).
   */
  static async cancelOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { reason } = req.body;

      const order = await Order.findOne({
        $or: [{ orderId: id.toUpperCase() }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      });

      if (!order) {
        throw new AppError(`Order '${id}' not found.`, 404, ERROR_CODES.ORDER_NOT_FOUND);
      }

      if (user.role === UserRole.CUSTOMER && order.customerId.toString() !== (user._id as any).toString()) {
        throw new AppError('Unauthorized to cancel this order.', 403, ERROR_CODES.FORBIDDEN);
      }

      if (!OrderStateMachine.canCustomerCancel(order.status)) {
        throw new AppError(
          `Cannot cancel order in '${order.status}' status. Orders can only be cancelled prior to dispatch.`,
          400,
          ERROR_CODES.CANCEL_NOT_ALLOWED
        );
      }

      order.status = OrderStatus.CANCELLED;
      await order.save();

      await TrackingService.appendEvent({
        orderId: order.orderId,
        orderDocId: order._id as any,
        status: OrderStatus.CANCELLED,
        actorId: user._id,
        actorRole: user.role,
        actorName: user.name,
        note: `Cancelled by customer. Reason: ${reason || 'N/A'}`
      });

      return ApiResponse.success(res, order, 'Order cancelled successfully');
    } catch (error) {
      next(error);
    }
  }
}
