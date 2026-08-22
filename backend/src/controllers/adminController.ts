import { Response, NextFunction } from 'express';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { DeliveryAgent } from '../models/DeliveryAgent';
import { Zone } from '../models/Zone';
import { Area } from '../models/Area';
import { RateCard } from '../models/RateCard';
import { CODConfiguration } from '../models/CODConfiguration';
import { TrackingService } from '../services/trackingService';
import { AssignmentService } from '../services/assignmentService';
import { AuditLogService } from '../services/auditLogService';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../utils/apiResponse';
import { AppError } from '../middleware/errorHandler';
import { ERROR_CODES, DEFAULT_PAGE_SIZE } from '../constants';
import { OrderStatus, UserRole, AuditAction, AgentAvailabilityStatus } from '../types';

export class AdminController {
  /**
   * Operations Dashboard Statistics KPI summary.
   */
  static async getDashboardStats(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [
        totalOrders,
        activeOrders,
        deliveredToday,
        failedOrders,
        availableAgents,
        busyAgents,
        offlineAgents,
        revenueAgg
      ] = await Promise.all([
        Order.countDocuments(),
        Order.countDocuments({
          status: { $in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_DELIVERY] }
        }),
        Order.countDocuments({
          status: OrderStatus.DELIVERED,
          deliveredAt: { $gte: todayStart }
        }),
        Order.countDocuments({ status: OrderStatus.FAILED }),
        DeliveryAgent.countDocuments({ availabilityStatus: AgentAvailabilityStatus.AVAILABLE }),
        DeliveryAgent.countDocuments({ availabilityStatus: AgentAvailabilityStatus.BUSY }),
        DeliveryAgent.countDocuments({ availabilityStatus: AgentAvailabilityStatus.OFFLINE }),
        Order.aggregate([
          { $match: { status: OrderStatus.DELIVERED } },
          { $group: { _id: null, totalRevenue: { $sum: '$totalCharge' } } }
        ])
      ]);

      const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

      return ApiResponse.success(res, {
        totalOrders,
        activeOrders,
        deliveredToday,
        failedOrders,
        fleet: {
          available: availableAgents,
          busy: busyAgents,
          offline: offlineAgents,
          total: availableAgents + busyAgents + offlineAgents
        },
        totalRevenue
      });
    } catch (error) {
      next(error);
    }
  }

  // --- ZONES MANAGEMENT ---

  static async getZones(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const zones = await Zone.find().sort({ name: 1 }).lean();
      return ApiResponse.success(res, zones);
    } catch (error) {
      next(error);
    }
  }

  static async createZone(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const { name, code, description, cities, status } = req.body;
      const zone = await Zone.create({
        name,
        code: code.toUpperCase(),
        description,
        cities: cities || [],
        status: status || 'ACTIVE'
      });

      await AuditLogService.record({
        actor: { _id: req.user!._id, role: UserRole.ADMIN, name: req.user!.name, email: req.user!.email },
        action: AuditAction.ZONE_CREATED,
        entityType: 'Zone',
        entityId: zone.code,
        newValue: zone.toJSON()
      });

      return ApiResponse.created(res, zone, 'Zone created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateZone(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;
      const zone = await Zone.findByIdAndUpdate(id, req.body, { new: true });
      if (!zone) throw new AppError('Zone not found', 404, ERROR_CODES.ZONE_NOT_FOUND);

      return ApiResponse.success(res, zone, 'Zone updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // --- AREAS MANAGEMENT ---

  static async getAreas(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const query: any = {};
      if (req.query.zoneCode) {
        query.zoneCode = (req.query.zoneCode as string).toUpperCase();
      }

      const areas = await Area.find(query).populate('zoneId').sort({ name: 1 }).lean();
      return ApiResponse.success(res, areas);
    } catch (error) {
      next(error);
    }
  }

  static async createArea(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const { name, code, pincode, city, state, zoneCode, status } = req.body;

      const zone = await Zone.findOne({ code: zoneCode.toUpperCase() });
      if (!zone) {
        throw new AppError(`Zone code '${zoneCode}' does not exist.`, 404, ERROR_CODES.ZONE_NOT_FOUND);
      }

      const area = await Area.create({
        name,
        code: code.toUpperCase(),
        pincode: pincode.trim(),
        city,
        state,
        zoneId: zone._id,
        zoneCode: zone.code,
        status: status || 'ACTIVE'
      });

      await AuditLogService.record({
        actor: { _id: req.user!._id, role: UserRole.ADMIN, name: req.user!.name, email: req.user!.email },
        action: AuditAction.AREA_CREATED,
        entityType: 'Area',
        entityId: area.pincode,
        newValue: area.toJSON()
      });

      return ApiResponse.created(res, area, 'Area created and mapped to zone');
    } catch (error) {
      next(error);
    }
  }

  // --- RATE CARDS MANAGEMENT ---

  static async getRateCards(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const rateCards = await RateCard.find().sort({ customerType: 1, zoneType: 1, weightFrom: 1 }).lean();
      return ApiResponse.success(res, rateCards);
    } catch (error) {
      next(error);
    }
  }

  static async createRateCard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const rateCard = await RateCard.create(req.body);

      await AuditLogService.record({
        actor: { _id: req.user!._id, role: UserRole.ADMIN, name: req.user!.name, email: req.user!.email },
        action: AuditAction.RATE_CARD_CREATED,
        entityType: 'RateCard',
        entityId: (rateCard._id as any).toString(),
        newValue: rateCard.toJSON()
      });

      return ApiResponse.created(res, rateCard, 'Rate card created');
    } catch (error) {
      next(error);
    }
  }

  static async updateRateCard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;
      const rateCard = await RateCard.findByIdAndUpdate(id, req.body, { new: true });
      if (!rateCard) throw new AppError('Rate card not found', 404, ERROR_CODES.RATE_CARD_NOT_FOUND);

      return ApiResponse.success(res, rateCard, 'Rate card updated');
    } catch (error) {
      next(error);
    }
  }

  // --- COD CONFIGURATION ---

  static async getCODConfig(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const configs = await CODConfiguration.find().lean();
      return ApiResponse.success(res, configs);
    } catch (error) {
      next(error);
    }
  }

  static async upsertCODConfig(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const { customerType } = req.body;
      const config = await CODConfiguration.findOneAndUpdate(
        { customerType },
        req.body,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return ApiResponse.success(res, config, 'COD configuration updated');
    } catch (error) {
      next(error);
    }
  }

  // --- AGENTS FLEET MANAGEMENT ---

  static async getAgents(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const agents = await DeliveryAgent.find().populate('userId', 'name email phone status').sort({ employeeId: 1 }).lean();
      return ApiResponse.success(res, agents);
    } catch (error) {
      next(error);
    }
  }

  // --- ADMIN ORDER ACTIONS ---

  static async manualAssign(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;
      const { agentId, notes } = req.body;

      const order = await Order.findOne({
        $or: [{ orderId: id.toUpperCase() }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      });

      if (!order) throw new AppError(`Order '${id}' not found.`, 404, ERROR_CODES.ORDER_NOT_FOUND);

      const result = await AssignmentService.manualAssign(order, agentId, req.user!, notes);
      return ApiResponse.success(res, result, 'Agent manually assigned');
    } catch (error) {
      next(error);
    }
  }

  static async triggerAutoAssign(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;
      const order = await Order.findOne({
        $or: [{ orderId: id.toUpperCase() }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      });

      if (!order) throw new AppError(`Order '${id}' not found.`, 404, ERROR_CODES.ORDER_NOT_FOUND);

      const result = await AssignmentService.autoAssign(order);
      return ApiResponse.success(res, result, result.reason);
    } catch (error) {
      next(error);
    }
  }

  static async adminOverrideStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;
      const { newStatus, reason, notes } = req.body;
      const admin = req.user!;

      const order = await Order.findOne({
        $or: [{ orderId: id.toUpperCase() }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      });

      if (!order) throw new AppError(`Order '${id}' not found.`, 404, ERROR_CODES.ORDER_NOT_FOUND);

      const previousStatus = order.status;
      order.status = newStatus;
      if (newStatus === OrderStatus.DELIVERED) {
        order.deliveredAt = new Date();
      }
      await order.save();

      // Append immutable tracking event
      await TrackingService.appendEvent({
        orderId: order.orderId,
        orderDocId: order._id as any,
        status: newStatus,
        actorId: admin._id,
        actorRole: UserRole.ADMIN,
        actorName: `Admin (${admin.name})`,
        note: `[Admin Override] Reason: ${reason}. ${notes || ''}`,
        metadata: { previousStatus, newStatus, overrideReason: reason }
      });

      // Record strict audit log
      await AuditLogService.record({
        actor: { _id: admin._id, role: UserRole.ADMIN, name: admin.name, email: admin.email },
        action: AuditAction.ADMIN_STATUS_OVERRIDE,
        entityType: 'Order',
        entityId: order.orderId,
        previousValue: { status: previousStatus },
        newValue: { status: newStatus },
        reason
      });

      return ApiResponse.success(res, order, `Order status overridden from ${previousStatus} to ${newStatus}`);
    } catch (error) {
      next(error);
    }
  }

  static async getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const data = await AuditLogService.getLogs(req.query as any);
      return ApiResponse.success(res, data.logs, 'Audit logs retrieved', 200, {
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages
      });
    } catch (error) {
      next(error);
    }
  }
}
