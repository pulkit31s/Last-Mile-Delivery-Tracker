import mongoose, { Document, Schema } from 'mongoose';
import { CustomerType, CODSurchargeType } from '../types';

export interface ICODConfiguration extends Document {
  customerType: CustomerType;
  surchargeType: CODSurchargeType;
  surchargeValue: number; // Flat fee in currency OR percentage value (e.g. 2%)
  minimumCharge: number; // Surcharge floor
  maximumCharge: number; // Surcharge ceiling
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CODConfigurationSchema = new Schema<ICODConfiguration>(
  {
    customerType: { type: String, enum: Object.values(CustomerType), required: true, index: true },
    surchargeType: { type: String, enum: Object.values(CODSurchargeType), required: true },
    surchargeValue: { type: Number, required: true, min: 0 },
    minimumCharge: { type: Number, required: true, min: 0, default: 0 },
    maximumCharge: { type: Number, required: true, min: 0, default: 999999 },
    active: { type: Boolean, default: true, index: true }
  },
  {
    timestamps: true
  }
);

CODConfigurationSchema.index({ customerType: 1, active: 1 });

export const CODConfiguration = mongoose.model<ICODConfiguration>(
  'CODConfiguration',
  CODConfigurationSchema
);
