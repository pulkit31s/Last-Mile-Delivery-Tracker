'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  ArrowLeft,
  RefreshCw,
  Phone,
  Radio
} from 'lucide-react';
import { api } from '../../../../lib/api';
import { getSocket } from '../../../../lib/socket';
import { ITrackingEvent, OrderStatus } from '../../../../types';
import { StatusBadge } from '../../../../components/StatusBadge';

export default function TrackingPage() {
  const params = useParams();
  const orderId = (params?.id as string)?.toUpperCase();

  const [trackingData, setTrackingData] = useState<any>(null);
  const [timeline, setTimeline] = useState<ITrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reschedule Modal State
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('Customer was unavailable during first delivery attempt');
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const fetchTracking = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const res = await api.get(`/orders/${orderId}/tracking`);
      if (res.data?.success) {
        setTrackingData(res.data.data);
        setTimeline(res.data.data.timeline || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch tracking history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();

    // Setup real-time Socket.IO listener
    const socket = getSocket();
    socket.emit('join:order', orderId);

    const handleStatusUpdate = (eventPayload: any) => {
      if (eventPayload.orderId?.toUpperCase() === orderId) {
        fetchTracking();
      }
    };

    socket.on('order:status_updated', handleStatusUpdate);

    return () => {
      socket.emit('leave:order', orderId);
      socket.off('order:status_updated', handleStatusUpdate);
    };
  }, [orderId]);

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setRescheduleError(null);
    setRescheduling(true);

    try {
      const res = await api.post(`/orders/${orderId}/reschedule`, {
        newDeliveryDate: newDate,
        reason: rescheduleReason
      });

      if (res.data?.success) {
        setShowRescheduleModal(false);
        fetchTracking();
      }
    } catch (err: any) {
      setRescheduleError(err.response?.data?.error?.message || 'Failed to reschedule order');
    } finally {
      setRescheduling(false);
    }
  };

  if (loading && !trackingData) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
        <p className="text-sm text-slate-500">Loading live tracking information for #{orderId}...</p>
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Shipment Tracking Not Found</h2>
        <p className="text-xs text-slate-500">{error || `No tracking events found for order ${orderId}`}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
        >
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  const isFailed = trackingData.status === OrderStatus.FAILED;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Link & Title */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
          Live Socket Connected
        </div>
      </div>

      {/* Shipment Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tracking Shipment</span>
            <h1 className="text-2xl font-extrabold text-slate-900 font-mono flex items-center gap-2">
              #{trackingData.orderId}
            </h1>
          </div>
          <div>
            <StatusBadge status={trackingData.status} className="text-sm px-3 py-1" />
          </div>
        </div>

        {/* Failed Delivery Notice / Action */}
        {isFailed && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                Delivery Attempt Failed
              </p>
              <p className="text-xs text-rose-700">
                The agent could not complete delivery. Please choose a new delivery date to reschedule.
              </p>
            </div>
            <button
              onClick={() => setShowRescheduleModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm transition whitespace-nowrap"
            >
              Reschedule Delivery Now
            </button>
          </div>
        )}

        {/* Route Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
          <div className="p-3 bg-slate-50 rounded-xl space-y-1">
            <p className="font-bold text-slate-500 uppercase tracking-wider">Pickup Location</p>
            <p className="font-semibold text-slate-800">{trackingData.pickupAddress?.contactName}</p>
            <p className="text-slate-600">{trackingData.pickupAddress?.street}, {trackingData.pickupAddress?.area}</p>
            <p className="text-slate-400">{trackingData.pickupAddress?.city} - {trackingData.pickupAddress?.pincode}</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-1">
            <p className="font-bold text-slate-500 uppercase tracking-wider">Drop Destination</p>
            <p className="font-semibold text-slate-800">{trackingData.dropAddress?.contactName}</p>
            <p className="text-slate-600">{trackingData.dropAddress?.street}, {trackingData.dropAddress?.area}</p>
            <p className="text-slate-400">{trackingData.dropAddress?.city} - {trackingData.dropAddress?.pincode}</p>
          </div>
        </div>

        {/* Assigned Agent Profile Info if available */}
        {trackingData.assignedAgent && (
          <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-indigo-950">Assigned Agent: {trackingData.assignedAgent.employeeId}</p>
                <p className="text-indigo-700">Vehicle: {trackingData.assignedAgent.vehicleType} ({trackingData.assignedAgent.vehicleNumber})</p>
              </div>
            </div>
            {trackingData.assignedAgent.phone && (
              <span className="flex items-center gap-1 font-semibold text-indigo-800">
                <Phone className="w-3.5 h-3.5" />
                {trackingData.assignedAgent.phone}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Immutable Chronological Timeline */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Immutable Tracking History ({timeline.length} events)
          </h2>
          <button
            onClick={fetchTracking}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition"
            title="Refresh Timeline"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {timeline.map((event, idx) => {
            const isLatest = idx === timeline.length - 1;
            return (
              <div key={event._id || idx} className="relative group">
                {/* Dot */}
                <div
                  className={`absolute -left-[19px] top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                    isLatest
                      ? event.status === OrderStatus.FAILED
                        ? 'border-rose-600 bg-rose-600 ring-4 ring-rose-100'
                        : event.status === OrderStatus.DELIVERED
                        ? 'border-emerald-600 bg-emerald-600 ring-4 ring-emerald-100'
                        : 'border-indigo-600 bg-indigo-600 ring-4 ring-indigo-100'
                      : 'border-slate-300'
                  }`}
                />

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={event.status} />
                      <span className="text-xs font-bold text-slate-700">
                        {event.actorName ? `${event.actorName}` : `[${event.actorRole}]`}
                      </span>
                    </div>
                    <time className="text-[11px] font-medium text-slate-400">
                      {new Date(event.timestamp).toLocaleString()}
                    </time>
                  </div>

                  {event.note && (
                    <p className="text-xs text-slate-600 font-medium">{event.note}</p>
                  )}

                  {event.location?.addressText && (
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {event.location.addressText}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Reschedule Delivery
              </h3>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {rescheduleError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {rescheduleError}
              </div>
            )}

            <form onSubmit={handleReschedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select New Delivery Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Rescheduling
                </label>
                <textarea
                  required
                  rows={3}
                  value={rescheduleReason}
                  onChange={e => setRescheduleReason(e.target.value)}
                  placeholder="Specify instructions or reason for new delivery slot"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduling || !newDate}
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  {rescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
