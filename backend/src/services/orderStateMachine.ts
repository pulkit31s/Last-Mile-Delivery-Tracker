import { OrderStatus } from '../types';
import { AppError } from '../middleware/errorHandler';
import { ERROR_CODES } from '../constants';

export class OrderStateMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.CREATED]: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
    [OrderStatus.ASSIGNED]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
    [OrderStatus.PICKED_UP]: [OrderStatus.IN_TRANSIT],
    [OrderStatus.IN_TRANSIT]: [OrderStatus.OUT_FOR_DELIVERY],
    [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.FAILED],
    [OrderStatus.FAILED]: [OrderStatus.RESCHEDULED],
    [OrderStatus.RESCHEDULED]: [OrderStatus.ASSIGNED],
    [OrderStatus.DELIVERED]: [], // Terminal state
    [OrderStatus.CANCELLED]: []  // Terminal state
  };

  /**
   * Validates if a proposed status transition is permitted.
   */
  static isValidTransition(currentStatus: OrderStatus, targetStatus: OrderStatus): boolean {
    const allowed = this.ALLOWED_TRANSITIONS[currentStatus] || [];
    return allowed.includes(targetStatus);
  }

  /**
   * Asserts valid transition or throws AppError.
   */
  static assertValidTransition(currentStatus: OrderStatus, targetStatus: OrderStatus): void {
    if (!this.isValidTransition(currentStatus, targetStatus)) {
      const allowed = this.ALLOWED_TRANSITIONS[currentStatus] || [];
      throw new AppError(
        `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: [${allowed.join(', ') || 'None (Terminal state)'}].`,
        400,
        ERROR_CODES.INVALID_STATUS_TRANSITION
      );
    }
  }

  /**
   * Returns whether an order in this status can be cancelled by a customer.
   */
  static canCustomerCancel(status: OrderStatus): boolean {
    return status === OrderStatus.CREATED || status === OrderStatus.ASSIGNED;
  }
}
