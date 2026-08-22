'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Calculator, ArrowRight, CheckCircle, AlertCircle, MapPin, Truck, HelpCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import { CustomerType, PaymentType, IPricingQuoteResult } from '../../../types';

export default function NewOrderPage() {
  const router = useRouter();
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [bookingOrder, setBookingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<IPricingQuoteResult | null>(null);

  // Form State
  const [form, setForm] = useState({
    pickupStreet: '124 Block C, Rohini Sector 9',
    pickupArea: 'Rohini',
    pickupCity: 'Delhi',
    pickupState: 'Delhi',
    pickupPincode: '110085',
    pickupContactName: 'Aarav Sharma',
    pickupContactPhone: '9811122233',

    dropStreet: '45 Saket Community Centre',
    dropArea: 'Saket',
    dropCity: 'Delhi',
    dropState: 'Delhi',
    dropPincode: '110017',
    dropContactName: 'Priya Verma',
    dropContactPhone: '9822233344',

    length: 40,
    breadth: 30,
    height: 20,
    actualWeight: 4.5,

    orderType: CustomerType.B2C,
    paymentType: PaymentType.PREPAID,
    notes: 'Please handle with care. Fragile items inside.'
  });

  const handleGetQuote = async () => {
    setError(null);
    setLoadingQuote(true);
    try {
      const payload = {
        pickupPincode: form.pickupPincode,
        dropPincode: form.dropPincode,
        customerType: form.orderType,
        paymentType: form.paymentType,
        dimensions: {
          length: Number(form.length),
          breadth: Number(form.breadth),
          height: Number(form.height)
        },
        actualWeight: Number(form.actualWeight)
      };

      const res = await api.post('/orders/quote', payload);
      if (res.data?.success) {
        setQuote(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to calculate shipping quote.');
      setQuote(null);
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleCreateOrder = async () => {
    setError(null);
    setBookingOrder(true);
    try {
      const payload = {
        pickupAddress: {
          street: form.pickupStreet,
          area: form.pickupArea,
          city: form.pickupCity,
          state: form.pickupState,
          pincode: form.pickupPincode,
          contactName: form.pickupContactName,
          contactPhone: form.pickupContactPhone
        },
        dropAddress: {
          street: form.dropStreet,
          area: form.dropArea,
          city: form.dropCity,
          state: form.dropState,
          pincode: form.dropPincode,
          contactName: form.dropContactName,
          contactPhone: form.dropContactPhone
        },
        orderType: form.orderType,
        paymentType: form.paymentType,
        packageDimensions: {
          length: Number(form.length),
          breadth: Number(form.breadth),
          height: Number(form.height)
        },
        actualWeight: Number(form.actualWeight),
        notes: form.notes,
        autoAssign: true
      };

      const res = await api.post('/orders', payload);
      if (res.data?.success) {
        const createdOrderId = res.data.data.order.orderId;
        router.push(`/orders/${createdOrderId}/tracking`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create shipment order.');
    } finally {
      setBookingOrder(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            Book New Shipment
          </h1>
          <p className="text-sm text-slate-500">
            Enter pickup & drop locations, package dimensions, and preview dynamic pricing
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Addresses */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600" />
            1. Pickup Location
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Street Address</label>
              <input
                type="text"
                value={form.pickupStreet}
                onChange={e => setForm({ ...form, pickupStreet: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Area / Suburb</label>
                <input
                  type="text"
                  value={form.pickupArea}
                  onChange={e => setForm({ ...form, pickupArea: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pincode</label>
                <input
                  type="text"
                  value={form.pickupPincode}
                  onChange={e => setForm({ ...form, pickupPincode: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={form.pickupContactName}
                  onChange={e => setForm({ ...form, pickupContactName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={form.pickupContactPhone}
                  onChange={e => setForm({ ...form, pickupContactPhone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100 my-4" />

          <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            2. Drop Destination
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Street Address</label>
              <input
                type="text"
                value={form.dropStreet}
                onChange={e => setForm({ ...form, dropStreet: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Area / Suburb</label>
                <input
                  type="text"
                  value={form.dropArea}
                  onChange={e => setForm({ ...form, dropArea: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pincode</label>
                <input
                  type="text"
                  value={form.dropPincode}
                  onChange={e => setForm({ ...form, dropPincode: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={form.dropContactName}
                  onChange={e => setForm({ ...form, dropContactName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={form.dropContactPhone}
                  onChange={e => setForm({ ...form, dropContactPhone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Package & Dimensions */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              3. Package Specifications
            </h2>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Length (cm)</label>
                <input
                  type="number"
                  min="1"
                  value={form.length}
                  onChange={e => setForm({ ...form, length: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Breadth (cm)</label>
                <input
                  type="number"
                  min="1"
                  value={form.breadth}
                  onChange={e => setForm({ ...form, breadth: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Height (cm)</label>
                <input
                  type="number"
                  min="1"
                  value={form.height}
                  onChange={e => setForm({ ...form, height: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Actual Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={form.actualWeight}
                onChange={e => setForm({ ...form, actualWeight: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Customer Tier</label>
                <select
                  value={form.orderType}
                  onChange={e => setForm({ ...form, orderType: e.target.value as CustomerType })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value={CustomerType.B2C}>B2C (Retail)</option>
                  <option value={CustomerType.B2B}>B2B (Enterprise)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Method</label>
                <select
                  value={form.paymentType}
                  onChange={e => setForm({ ...form, paymentType: e.target.value as PaymentType })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value={PaymentType.PREPAID}>Prepaid</option>
                  <option value={PaymentType.COD}>Cash on Delivery (COD)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGetQuote}
              disabled={loadingQuote}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center justify-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              {loadingQuote ? 'Calculating Volumetric & Slab Quote...' : 'Calculate Shipping Quote'}
            </button>
          </div>

          {/* Pricing Breakdown Card */}
          {quote && (
            <div className="bg-indigo-50/70 border border-indigo-200 p-5 rounded-2xl space-y-4 shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <h3 className="font-bold text-sm text-indigo-900 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Authoritative Pricing Breakdown
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                  {quote.zoneType.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="text-xs space-y-2 text-slate-700">
                <div className="flex justify-between">
                  <span>Actual Weight:</span>
                  <span className="font-semibold">{quote.actualWeight} kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Volumetric Weight (L×B×H/5000):</span>
                  <span className="font-semibold">{quote.volumetricWeight} kg</span>
                </div>
                <div className="flex justify-between text-indigo-950 font-bold bg-white/70 px-2 py-1 rounded">
                  <span>Chargeable Weight MAX(A, V):</span>
                  <span>{quote.chargeableWeight} kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Base Freight Charge ({quote.breakdown.weightSlab}):</span>
                  <span className="font-semibold">₹{quote.baseCharge}</span>
                </div>
                <div className="flex justify-between">
                  <span>COD Surcharge:</span>
                  <span className="font-semibold">₹{quote.codSurcharge}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-indigo-900 border-t border-indigo-200 pt-2">
                  <span>Total Payable:</span>
                  <span>₹{quote.totalCharge}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateOrder}
                disabled={bookingOrder}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Truck className="w-5 h-5" />
                {bookingOrder ? 'Booking Shipment...' : 'Confirm & Auto-Assign Agent'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
