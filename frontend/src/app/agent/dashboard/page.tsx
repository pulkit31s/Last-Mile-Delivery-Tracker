'use client';

import React, { useEffect, useState } from 'react';
import {
  Navigation,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  Radio,
  Phone,
  Package,
  ArrowRight,
  RefreshCw,
  Send
} from 'lucide-react';
import { api } from '../../../lib/api';
import { getStoredUser } from '../../../lib/auth';
import { IOrder, OrderStatus, AgentAvailabilityStatus, FailureReason } from '../../../types';
import { StatusBadge } from '../../../components/StatusBadge';

export default function AgentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [agentProfile, setAgentProfile] = useState<any>(null);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Status Action Modal State
  const [activeModalOrder, setActiveModalOrder] = useState<IOrder | null>(null);
  const [nextStatus, setNextStatus] = useState<OrderStatus | null>(null);
  const [failureReason, setFailureReason] = useState<string>(FailureReason.CUSTOMER_UNAVAILABLE);
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgentData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/agent/orders');
      if (res.data?.success) {
        setAgentProfile(res.data.data.agentProfile);
        setOrders(res.data.data.orders);
      }
    } catch (err: any) {
      console.error('Error fetching agent deliveries', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUser(getStoredUser());
    fetchAgentData();
  }, []);

  const handleToggleAvailability = async (newStatus: AgentAvailabilityStatus) => {
    try {
      const res = await api.patch('/agent/availability', { availabilityStatus: newStatus });
      if (res.data?.success) {
        setAgentProfile(res.data.data);
      }
    } catch (err: any) {
      alert(`Failed to update status: ${err.response?.data?.error?.message || err.message}`);
    }
  };

  const handleUpdateGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          try {
            await api.patch('/agent/location', {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            });
            alert('Location updated successfully!');
            fetchAgentData();
          } catch (err: any) {
            alert('Failed to send GPS coordinates to server.');
          }
        },
        () => {
          // Fallback mock GPS update for test demo
          api.patch('/agent/location', {
            lat: 28.7041 + (Math.random() - 0.5) * 0.01,
            lng: 77.1025 + (Math.random() - 0.5) * 0.01
          }).then(() => {
            alert('Updated simulated GPS coordinates.');
            fetchAgentData();
          });
        }
      );
    }
  };

  const openStatusDialog = (order: IOrder, targetStatus: OrderStatus) => {
    setActiveModalOrder(order);
    setNextStatus(targetStatus);
    setStatusNotes('');
    setError(null);
  };

  const handleConfirmStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalOrder || !nextStatus) return;

    setUpdatingStatus(true);
    setError(null);
    try {
      const payload: any = {
        status: nextStatus,
        notes: statusNotes
      };

      if (nextStatus === OrderStatus.FAILED) {
        payload.failureReason = failureReason;
      }

      const res = await api.patch(`/agent/orders/${activeModalOrder.orderId}/status`, payload);
      if (res.data?.success) {
        setActiveModalOrder(null);
        setNextStatus(null);
        fetchAgentData();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getNextActions = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.ASSIGNED:
        return [{ target: OrderStatus.PICKED_UP, label: 'Mark Picked Up', color: 'bg-indigo-600' }];
      case OrderStatus.PICKED_UP:
        return [{ target: OrderStatus.IN_TRANSIT, label: 'Start Transit', color: 'bg-purple-600' }];
      case OrderStatus.IN_TRANSIT:
        return [{ target: OrderStatus.OUT_FOR_DELIVERY, label: 'Out for Delivery', color: 'bg-amber-600' }];
      case OrderStatus.OUT_FOR_DELIVERY:
        return [
          { target: OrderStatus.DELIVERED, label: 'Mark Delivered', color: 'bg-emerald-600' },
          { target: OrderStatus.FAILED, label: 'Report Failure', color: 'bg-rose-600' }
        ];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Status Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              Agent Portal: {agentProfile?.employeeId || user?.name}
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {agentProfile?.vehicleType} ({agentProfile?.vehicleNumber})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Zone: <span className="font-semibold text-slate-700">{agentProfile?.currentZone || 'ZONE_NORTH'}</span> • Active Orders:{' '}
            <span className="font-semibold text-indigo-600">{agentProfile?.activeOrders || 0} / {agentProfile?.maxConcurrentOrders || 5}</span>
          </p>
        </div>

        {/* Availability Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {Object.values(AgentAvailabilityStatus).map(s => (
              <button
                key={s}
                onClick={() => handleToggleAvailability(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  agentProfile?.availabilityStatus === s
                    ? s === 'AVAILABLE'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : s === 'BUSY'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={handleUpdateGPS}
            title="Broadcast current GPS location"
            className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition"
          >
            <Radio className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Assigned Deliveries List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Assigned Shipments ({orders.length})
          </h2>
          <button
            onClick={fetchAgentData}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading assignments...</div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-500 text-sm font-medium">No deliveries currently assigned.</p>
            <p className="text-xs text-slate-400">Keep status set to AVAILABLE to receive automated dispatches.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map(order => {
              const actions = getNextActions(order.status);
              return (
                <div
                  key={order._id}
                  className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 hover:border-indigo-300 transition"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-sm text-indigo-600 font-mono">#{order.orderId}</span>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start gap-2 text-slate-700">
                      <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Pickup:</span> {order.pickupAddress.street}, {order.pickupAddress.area} ({order.pickupAddress.contactPhone})
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-slate-700">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Drop:</span> {order.dropAddress.street}, {order.dropAddress.area} ({order.dropAddress.contactPhone})
                      </div>
                    </div>

                    <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200">
                      <span>Weight: {order.chargeableWeight} kg</span>
                      <span className="font-semibold text-slate-800">
                        {order.paymentType} • ₹{order.totalCharge}
                      </span>
                    </div>
                  </div>

                  {/* Actions for Agent */}
                  {actions.length > 0 && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      {actions.map(act => (
                        <button
                          key={act.target}
                          onClick={() => openStatusDialog(order, act.target)}
                          className={`flex-1 py-2 text-xs font-bold text-white rounded-lg transition shadow-sm ${act.color}`}
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status Transition Dialog Modal */}
      {activeModalOrder && nextStatus && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                Update Order #{activeModalOrder.orderId} → {nextStatus.replace(/_/g, ' ')}
              </h3>
              <button
                onClick={() => setActiveModalOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleConfirmStatusUpdate} className="space-y-4">
              {nextStatus === OrderStatus.FAILED && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mandatory Failure Reason
                  </label>
                  <select
                    value={failureReason}
                    onChange={e => setFailureReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-rose-700"
                  >
                    {Object.values(FailureReason).map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Notes / Comments (Optional)
                </label>
                <textarea
                  rows={3}
                  value={statusNotes}
                  onChange={e => setStatusNotes(e.target.value)}
                  placeholder="e.g. Package handed over to recipient / recipient gate locked"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition ${
                    nextStatus === OrderStatus.FAILED ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {updatingStatus ? 'Updating...' : `Confirm ${nextStatus.replace(/_/g, ' ')}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
