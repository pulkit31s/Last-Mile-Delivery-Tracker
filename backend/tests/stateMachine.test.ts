import { OrderStateMachine } from '../src/services/orderStateMachine';
import { OrderStatus } from '../src/types';

describe('Order State Machine & Transition Rules', () => {
  it('should allow valid happy path status transitions', () => {
    expect(OrderStateMachine.isValidTransition(OrderStatus.CREATED, OrderStatus.ASSIGNED)).toBe(true);
    expect(OrderStateMachine.isValidTransition(OrderStatus.ASSIGNED, OrderStatus.PICKED_UP)).toBe(true);
    expect(OrderStateMachine.isValidTransition(OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT)).toBe(true);
    expect(OrderStateMachine.isValidTransition(OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_DELIVERY)).toBe(true);
    expect(OrderStateMachine.isValidTransition(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED)).toBe(true);
  });

  it('should allow failed delivery to reschedule and reassign', () => {
    expect(OrderStateMachine.isValidTransition(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.FAILED)).toBe(true);
    expect(OrderStateMachine.isValidTransition(OrderStatus.FAILED, OrderStatus.RESCHEDULED)).toBe(true);
    expect(OrderStateMachine.isValidTransition(OrderStatus.RESCHEDULED, OrderStatus.ASSIGNED)).toBe(true);
  });

  it('should reject invalid and backwards status transitions', () => {
    expect(OrderStateMachine.isValidTransition(OrderStatus.CREATED, OrderStatus.DELIVERED)).toBe(false);
    expect(OrderStateMachine.isValidTransition(OrderStatus.PICKED_UP, OrderStatus.CREATED)).toBe(false);
    expect(OrderStateMachine.isValidTransition(OrderStatus.DELIVERED, OrderStatus.IN_TRANSIT)).toBe(false);
    expect(OrderStateMachine.isValidTransition(OrderStatus.CANCELLED, OrderStatus.ASSIGNED)).toBe(false);
  });

  it('should only allow customer cancellation prior to dispatch', () => {
    expect(OrderStateMachine.canCustomerCancel(OrderStatus.CREATED)).toBe(true);
    expect(OrderStateMachine.canCustomerCancel(OrderStatus.ASSIGNED)).toBe(true);
    expect(OrderStateMachine.canCustomerCancel(OrderStatus.PICKED_UP)).toBe(false);
    expect(OrderStateMachine.canCustomerCancel(OrderStatus.IN_TRANSIT)).toBe(false);
    expect(OrderStateMachine.canCustomerCancel(OrderStatus.OUT_FOR_DELIVERY)).toBe(false);
    expect(OrderStateMachine.canCustomerCancel(OrderStatus.DELIVERED)).toBe(false);
  });
});
