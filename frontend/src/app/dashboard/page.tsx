'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, PlusCircle, Clock, CheckCircle2, AlertTriangle, Search, ArrowUpRight, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { getStoredUser } from '../../lib/auth';
import { IOrder, OrderStatus } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';

export default function CustomerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/orders', { params });
      if (res.data?.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUser(getStoredUser());
    fetchOrders();
  }, [statusFilter]);

  const activeCount = orders.filter(o =>
    [OrderStatus.CREATED, OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_DELIVERY].includes(o.status)
  ).length;
  const deliveredCount = orders.filter(o => o.status === OrderStatus.DELIVERED).length;
  const failedCount = orders.filter(o => o.status === OrderStatus.FAILED).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.name || 'Customer'} 👋
          </h1>
          <p className="text-sm text-slate-500">
            {user?.companyName ? `${user.companyName} • ` : ''}Manage and track all your last-mile shipments
          </p>
        </div>
        <Link
          href="/orders/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          Book New Shipment
        </Link>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Deliveries</p>
            <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivered</p>
            <p className="text-2xl font-bold text-slate-900">{deliveredCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Failed / Attention</p>
            <p className="text-2xl font-bold text-slate-900">{failedCount}</p>
          </div>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Shipment History
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Order ID, city..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchOrders()}
                className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Statuses</option>
              {Object.values(OrderStatus).map(s => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            <button
              onClick={fetchOrders}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading shipments...</div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-500 text-sm font-medium">No shipment orders found.</p>
            <Link
              href="/orders/new"
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
            >
              Create your first delivery order →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Pickup Area</th>
                  <th className="py-3 px-4">Drop Destination</th>
                  <th className="py-3 px-4">Weight (Chargeable)</th>
                  <th className="py-3 px-4">Type / Payment</th>
                  <th className="py-3 px-4">Charge</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(order => (
                  <tr key={order._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-bold text-indigo-600">
                      <Link href={`/orders/${order.orderId}/tracking`} className="hover:underline">
                        {order.orderId}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800">{order.pickupAddress.area}</p>
                      <span className="text-[10px] text-slate-400">{order.pickupZone}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800">{order.dropAddress.area}</p>
                      <span className="text-[10px] text-slate-400">{order.dropZone}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {order.chargeableWeight} kg
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700">{order.orderType}</span> •{' '}
                      <span className={order.paymentType === 'COD' ? 'text-amber-700 font-semibold' : 'text-slate-500'}>
                        {order.paymentType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ₹{order.totalCharge}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <Link
                        href={`/orders/${order.orderId}/tracking`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold transition"
                      >
                        Track Live
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
