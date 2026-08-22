import { DeliveryAgent, IDeliveryAgent } from '../models/DeliveryAgent';
import { Order, IOrder } from '../models/Order';
import { User } from '../models/User';
import { calculateHaversineDistance, isLocationStale } from '../utils/geo';
import { AgentAvailabilityStatus, OrderStatus, UserRole } from '../types';
import { TrackingService } from './trackingService';
import { NotificationService } from '../notifications/notificationService';
import { logger } from '../config/logger';

export interface IAssignmentResult {
  success: boolean;
  agent?: IDeliveryAgent;
  agentUser?: any;
  reason: string;
  distanceKm?: number;
}

export class AssignmentService {
  /**
   * Intelligently auto-assigns the best available delivery agent to an order.
   */
  static async autoAssign(order: IOrder): Promise<IAssignmentResult> {
    const pickupZone = order.pickupZone;
    const pickupCoords = order.pickupAddress.coordinates;

    // 1. Fetch all available agents with capacity
    const candidateAgents = await DeliveryAgent.find({
      availabilityStatus: AgentAvailabilityStatus.AVAILABLE,
      $expr: { $lt: ['$activeOrders', '$maxConcurrentOrders'] }
    }).populate('userId');

    if (!candidateAgents || candidateAgents.length === 0) {
      logger.warn(`Auto-assignment failed for order ${order.orderId}: No available agents with capacity.`);
      return {
        success: false,
        reason: 'No delivery agents are currently available with capacity.'
      };
    }

    // 2. Score and rank candidates
    interface IScoredCandidate {
      agent: IDeliveryAgent;
      score: number;
      distanceKm?: number;
      isSameZone: boolean;
      explanation: string;
    }

    const scoredCandidates: IScoredCandidate[] = [];

    for (const agent of candidateAgents) {
      const isSameZone = agent.currentZone?.toUpperCase() === pickupZone.toUpperCase();
      let distanceKm: number | undefined;
      let hasValidGps = false;

      if (
        pickupCoords &&
        pickupCoords.lat &&
        pickupCoords.lng &&
        agent.currentLocation &&
        agent.currentLocation.lat &&
        agent.currentLocation.lng &&
        agent.lastLocationUpdate &&
        !isLocationStale(agent.lastLocationUpdate)
      ) {
        distanceKm = calculateHaversineDistance(
          { lat: pickupCoords.lat, lng: pickupCoords.lng },
          { lat: agent.currentLocation.lat, lng: agent.currentLocation.lng }
        );
        hasValidGps = true;
      }

      let score = 0;
      if (isSameZone) score += 100;
      if (hasValidGps && distanceKm !== undefined) {
        score -= distanceKm * 2;
      }
      score -= agent.activeOrders * 10;

      let explanation = `Agent ${(agent.userId as any)?.name || agent.employeeId}: `;
      if (isSameZone) explanation += `Same Zone (${pickupZone}), `;
      else explanation += `Zone (${agent.currentZone || 'Unassigned'}), `;

      if (hasValidGps && distanceKm !== undefined) {
        explanation += `${distanceKm} km away, `;
      } else {
        explanation += `GPS fallback, `;
      }
      explanation += `${agent.activeOrders} active order(s)`;

      scoredCandidates.push({
        agent,
        score,
        distanceKm,
        isSameZone,
        explanation
      });
    }

    // Sort descending by score
    scoredCandidates.sort((a, b) => b.score - a.score);

    // 3. Attempt atomic assignment to top candidate
    for (const candidate of scoredCandidates) {
      const selectedAgent = candidate.agent;

      const updatedAgent = await DeliveryAgent.findOneAndUpdate(
        {
          _id: selectedAgent._id,
          availabilityStatus: AgentAvailabilityStatus.AVAILABLE,
          $expr: { $lt: ['$activeOrders', '$maxConcurrentOrders'] }
        },
        {
          $inc: { activeOrders: 1 }
        },
        { new: true }
      );

      if (updatedAgent) {
        if (updatedAgent.activeOrders >= updatedAgent.maxConcurrentOrders) {
          await DeliveryAgent.findByIdAndUpdate(updatedAgent._id, {
            availabilityStatus: AgentAvailabilityStatus.BUSY
          });
        }

        const reason = `Auto-assigned via intelligent ranking: ${candidate.explanation}`;

        order.assignedAgentId = updatedAgent._id as any;
        order.status = OrderStatus.ASSIGNED;
        order.assignmentDetails = {
          assignedAt: new Date(),
          method: 'AUTO',
          reason,
          distanceKm: candidate.distanceKm
        };
        await order.save();

        await TrackingService.appendEvent({
          orderId: order.orderId,
          orderDocId: order._id as any,
          status: OrderStatus.ASSIGNED,
          actorRole: 'SYSTEM',
          actorName: 'Auto-Assignment Engine',
          note: reason,
          metadata: {
            agentId: updatedAgent._id,
            employeeId: updatedAgent.employeeId,
            distanceKm: candidate.distanceKm
          }
        });

        const customer = await User.findById(order.customerId);
        if (customer) {
          await NotificationService.notifyOrderLifecycle(
            order,
            customer.email,
            customer.phone,
            'AGENT_ASSIGNED',
            `Agent ${(selectedAgent.userId as any)?.name || 'Assigned'} has been allocated to your shipment.`
          );
        }

        logger.info(`[Auto-Assignment] Order #${order.orderId} assigned to ${updatedAgent.employeeId}. Reason: ${reason}`);

        return {
          success: true,
          agent: updatedAgent,
          agentUser: selectedAgent.userId,
          reason,
          distanceKm: candidate.distanceKm
        };
      }
    }

    return {
      success: false,
      reason: 'Concurrent assignment conflict; please retry.'
    };
  }

  /**
   * Manually assigns a specific agent to an order (Admin capability).
   */
  static async manualAssign(
    order: IOrder,
    agentId: string,
    adminUser: any,
    notes?: string
  ): Promise<IAssignmentResult> {
    const agent = await DeliveryAgent.findById(agentId).populate('userId');
    if (!agent) {
      return { success: false, reason: 'Delivery agent not found.' };
    }

    if (order.assignedAgentId && order.assignedAgentId.toString() !== agentId) {
      await DeliveryAgent.findByIdAndUpdate(order.assignedAgentId, {
        $inc: { activeOrders: -1 }
      });
    }

    const updatedAgent = await DeliveryAgent.findByIdAndUpdate(
      agent._id,
      { $inc: { activeOrders: 1 } },
      { new: true }
    );

    const reason = `Manually assigned by Admin ${adminUser.name}. ${notes || ''}`;

    order.assignedAgentId = agent._id as any;
    order.status = OrderStatus.ASSIGNED;
    order.assignmentDetails = {
      assignedAt: new Date(),
      method: 'MANUAL',
      reason
    };
    await order.save();

    await TrackingService.appendEvent({
      orderId: order.orderId,
      orderDocId: order._id as any,
      status: OrderStatus.ASSIGNED,
      actorId: adminUser._id,
      actorRole: UserRole.ADMIN,
      actorName: adminUser.name,
      note: reason,
      metadata: { agentId: agent._id, employeeId: agent.employeeId }
    });

    return {
      success: true,
      agent: updatedAgent || agent,
      agentUser: agent.userId,
      reason
    };
  }
}
