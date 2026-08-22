import { Response, NextFunction } from 'express';
import { DeliveryAgent } from '../models/DeliveryAgent';
import { Order } from '../models/Order';
import { TrackingService } from '../services/trackingService';
import { SocketManager } from '../sockets/socketManager';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../utils/apiResponse';
import { AppError } from '../middleware/errorHandler';
import { ERROR_CODES } from '../constants';
import { OrderStatus, AgentAvailabilityStatus } from '../types';

export class AgentController {
  /**
   * Retrieves orders assigned to the logged-in delivery agent.
   */
  static async getAssignedOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const user = req.user!;
      const agent = await DeliveryAgent.findOne({ userId: user._id });

      if (!agent) {
        throw new AppError('Delivery agent profile not found.', 404, ERROR_CODES.USER_NOT_FOUND);
      }

      const statusFilter = req.query.status as string;
      const query: any = { assignedAgentId: agent._id };

      if (statusFilter) {
        query.status = statusFilter;
      }

      const orders = await Order.find(query)
        .populate('customerId', 'name email phone')
        .sort({ updatedAt: -1 })
        .lean();

      return ApiResponse.success(
        res,
        {
          agentProfile: agent,
          orders
        },
        'Assigned deliveries retrieved'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates delivery agent availability status (AVAILABLE, BUSY, OFFLINE).
   */
  static async updateAvailability(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const user = req.user!;
      const { availabilityStatus } = req.body;

      const agent = await DeliveryAgent.findOneAndUpdate(
        { userId: user._id },
        { availabilityStatus },
        { new: true }
      );

      if (!agent) {
        throw new AppError('Delivery agent profile not found.', 404, ERROR_CODES.USER_NOT_FOUND);
      }

      return ApiResponse.success(res, agent, `Availability status updated to ${availabilityStatus}`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates agent current GPS coordinates.
   */
  static async updateLocation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const user = req.user!;
      const { lat, lng, currentZone } = req.body;

      const updateData: any = {
        currentLocation: { lat, lng },
        lastLocationUpdate: new Date()
      };

      if (currentZone) {
        updateData.currentZone = currentZone;
      }

      const agent = await DeliveryAgent.findOneAndUpdate({ userId: user._id }, updateData, { new: true });

      if (!agent) {
        throw new AppError('Delivery agent profile not found.', 404, ERROR_CODES.USER_NOT_FOUND);
      }

      // Find active out for delivery order if any, to broadcast to tracking customer
      const activeOrder = await Order.findOne({
        assignedAgentId: agent._id,
        status: { $in: [OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_DELIVERY] }
      });

      SocketManager.emitAgentLocationUpdate(
        (agent._id as any).toString(),
        activeOrder?.orderId,
        { lat, lng }
      );

      return ApiResponse.success(res, agent, 'Location updated');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates delivery status for an assigned order.
   */
  static async updateOrderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { status, failureReason, notes, location } = req.body;

      const result = await TrackingService.transitionAgentStatus(
        id.toUpperCase(),
        user,
        status,
        { failureReason, notes, location }
      );

      return ApiResponse.success(
        res,
        result,
        `Delivery status successfully updated to '${status}'.`
      );
    } catch (error) {
      next(error);
    }
  }
}
