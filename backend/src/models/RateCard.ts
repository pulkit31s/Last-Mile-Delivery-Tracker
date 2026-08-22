import mongoose, { Document, Schema } from 'mongoose';
import { CustomerType, ZoneType } from '../types';

export interface IRateCard extends Document {
  name: string;
  customerType: CustomerType;
  zoneType: ZoneType;
  weightFrom: number; // in kg (e.g. 0)
  weightTo: number; // in kg (e.g. 1, 5, 999)
  baseRate: number; // base charge in currency units
  incrementalRate: number; // rate per additional kg above weightFrom
  effectiveFrom: Date;
  effectiveTo?: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RateCardSchema = new Schema<IRateCard>(
  {
    name: { type: String, required: true, trim: true },
    customerType: { type: String, enum: Object.values(CustomerType), required: true, index: true },
    zoneType: { type: String, enum: Object.values(ZoneType), required: true, index: true },
    weightFrom: { type: Number, required: true, min: 0 },
    weightTo: { type: Number, required: true, min: 0 },
    baseRate: { type: Number, required: true, min: 0 },
    incrementalRate: { type: Number, required: true, min: 0, default: 0 },
    effectiveFrom: { type: Date, required: true, default: Date.now },
    effectiveTo: { type: Date },
    active: { type: Boolean, default: true, index: true }
  },
  {
    timestamps: true
  }
);

// Compound index for fast rate resolution lookup
RateCardSchema.index({ customerType: 1, zoneType: 1, active: 1, weightFrom: 1, weightTo: 1 });

export const RateCard = mongoose.model<IRateCard>('RateCard', RateCardSchema);
