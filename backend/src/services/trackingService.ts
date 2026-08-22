import mongoose from 'mongoose';
import { TrackingEvent, ITrackingEvent } from '../models/TrackingEvent';
import { Order, IOrder } from '../models/Order';
import { DeliveryAgent } from '../models/DeliveryAgent';
import { User } from '../models/User';
import { OrderStatus, UserRole, ILocationCoordinates } from '../types';
import { OrderStateMachine } from './orderStateMachine';
import { SocketManager } from '../sockets/socketManager';
import { NotificationService } from '../notifications/notificationService';
import { AppError } from '../middleware/errorHandler';
import { ERROR_CODES } from '../constants';
import { logger } from '../config/logger';

export interface IAppendEventInput {
  orderId: string;
  orderDocId: mongoose.Types.ObjectId;
  status: OrderStatus;
  actorId?: mongoose.Types.ObjectId;
  actorRole: UserRole | 'SYSTEM';
  actorName?: string;
  location?: ILocationCoordinates & { addressText?: string };
  note?: string;
  metadata?: Record<string, any>;
}

export class TrackingService {
  /**
   * Appends an immutable tracking event to the database and emits real-time event.
   */
  static async appendEvent(input: IAppendEventInput): Promise<ITrackingEvent> {
    const event = await TrackingEvent.create({
      orderId: input.orderId,
      orderDocId: input.orderDocId,
      status: input.status,
      timestamp: new Date(),
      actorId: input.actorId,
      actorRole: input.actorRole,
      actorName: input.actorName,
      location: input.location,
      note: input.note,
      metadata: input.metadata
    });

    // Emit live event to connected WebSocket clients in order room and admin stream
    SocketManager.emitOrderStatusUpdate(input.orderId, {
      orderId: input.orderId,
      status: input.status,
      timestamp: event.timestamp,
      actorName: input.actorName,
      note: input.note,
      location: input.location
    });

    logger.info(`[Tracking] Appended event '${input.status}' for Order #${input.orderId}`);
    return event;
  }

  /**
   * Retrieves the full chronological tracking timeline for an order.
   */
  static async getOrderTimeline(orderDocId: mongoose.Types.ObjectId): Promise<any[]> {
    return TrackingEvent.find({ orderDocId }).sort({ timestamp: 1 }).lean();
  }

  /**
   * Atomically executes a delivery agent status transition:
   * 1. Validates status state machine.
   * 2. Updates order status.
   * 3. Decrements agent active orders if delivered/failed.
   * 4. Appends immutable tracking event.
   * 5. Sends customer notification.
   */
  static async transitionAgentStatus(
    orderId: string,
    agentUser: any,
    targetStatus: OrderStatus,
    options: {
      failureReason?: string;
      notes?: string;
      location?: ILocationCoordinates & { addressText?: string };
    }
  ): Promise<{ order: IOrder; event: ITrackingEvent }> {
    const order = await Order.findOne({ orderId });
    if (!order) {
      throw new AppError(`Order #${orderId} not found.`, 404, ERROR_CODES.ORDER_NOT_FOUND);
    }

    const agent = await DeliveryAgent.findOne({ userId: agentUser._id });
    if (!agent) {
      throw new AppError('Delivery agent profile not found.', 404, ERROR_CODES.USER_NOT_FOUND);
    }

    if (order.assignedAgentId?.toString() !== (agent._id as any).toString()) {
      throw new AppError(
        'Unauthorized: You are not the assigned delivery agent for this shipment.',
        403,
        ERROR_CODES.FORBIDDEN
      );
    }

    // Validate state machine progression
    OrderStateMachine.assertValidTransition(order.status, targetStatus);

    if (targetStatus === OrderStatus.FAILED && !options.failureReason) {
      throw new AppError(
        'Failure reason is mandatory when marking a delivery as Failed.',
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }

    const previousStatus = order.status;
    order.status = targetStatus;

    if (targetStatus === OrderStatus.DELIVERED) {
      order.deliveredAt = new Date();
      // Decrement agent active orders
      await DeliveryAgent.findByIdAndUpdate(agent._id, { $inc: { activeOrders: -1 } });
    } else if (targetStatus === OrderStatus.FAILED) {
      order.failureReason = options.failureReason;
      order.failureNote = options.notes;
      // Decrement agent active orders upon failure
      await DeliveryAgent.findByIdAndUpdate(agent._id, { $inc: { activeOrders: -1 } });
    }

    await order.save();

    // Update agent's last known location if coordinates provided
    if (options.location && options.location.lat && options.location.lng) {
      await DeliveryAgent.findByIdAndUpdate(agent._id, {
        currentLocation: { lat: options.location.lat, lng: options.location.lng },
        lastLocationUpdate: new Date()
      });
    }

    // Append immutable tracking event
    const event = await this.appendEvent({
      orderId: order.orderId,
      orderDocId: order._id as any,
      status: targetStatus,
      actorId: agentUser._id,
      actorRole: UserRole.AGENT,
      actorName: agentUser.name,
      location: options.location,
      note: options.notes || (targetStatus === OrderStatus.FAILED ? `Reason: ${options.failureReason}` : undefined),
      metadata: {
        previousStatus,
        failureReason: options.failureReason,
        agentEmployeeId: agent.employeeId
      }
    });

    // Notify Customer
    const customer = await User.findById(order.customerId);
    if (customer) {
      await NotificationService.notifyOrderLifecycle(
        order,
        customer.email,
        customer.phone,
        `STATUS_${targetStatus}`,
        options.notes || (targetStatus === OrderStatus.FAILED ? `Failure Reason: ${options.failureReason}` : undefined)
      );
    }

    return { order, event };
  }
}
