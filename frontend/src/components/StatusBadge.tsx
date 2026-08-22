import React from 'react';
import { OrderStatus } from '../types';

interface Props {
  status: OrderStatus | string;
  className?: string;
}

export const StatusBadge: React.FC<Props> = ({ status, className = '' }) => {
  const getBadgeStyle = (s: string) => {
    switch (s) {
      case OrderStatus.CREATED:
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case OrderStatus.ASSIGNED:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case OrderStatus.PICKED_UP:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case OrderStatus.IN_TRANSIT:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case OrderStatus.OUT_FOR_DELIVERY:
        return 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse';
      case OrderStatus.DELIVERED:
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case OrderStatus.FAILED:
        return 'bg-rose-50 text-rose-700 border-rose-300 font-semibold';
      case OrderStatus.RESCHEDULED:
        return 'bg-orange-50 text-orange-700 border-orange-300';
      case OrderStatus.CANCELLED:
        return 'bg-gray-100 text-gray-500 border-gray-300 line-through';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle(
        status
      )} ${className}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
};
