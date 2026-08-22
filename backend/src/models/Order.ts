import mongoose, { Document, Schema } from 'mongoose';
import {
  OrderStatus,
  CustomerType,
  PaymentType,
  IAddress,
  IPackageDimensions,
  FailureReason
} from '../types';

export interface IOrder extends Document {
  orderId: string; // Unique human-readable code e.g. "LM-849201"
  customerId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId; // User who placed order (Customer or Admin)
  pickupAddress: IAddress;
  dropAddress: IAddress;
  pickupZone: string;
  dropZone: string;
  orderType: CustomerType;
  paymentType: PaymentType;
  packageDimensions: IPackageDimensions;
  actualWeight: number;
  volumetricWeight: number;
  chargeableWeight: number;
  rateCardId?: mongoose.Types.ObjectId;
  baseCharge: number;
  codSurcharge: number;
  totalCharge: number;
  currency: string;
  assignedAgentId?: mongoose.Types.ObjectId;
  status: OrderStatus;
  failureReason?: FailureReason | string;
  failureNote?: string;
  scheduledDeliveryDate: Date;
  deliveredAt?: Date;
  assignmentDetails?: {
    assignedAt: Date;
    method: 'AUTO' | 'MANUAL';
    reason?: string;
    distanceKm?: number;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSubSchema = new Schema<IAddress>(
  {
    street: { type: String, required: true },
    area: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },
  { _id: false }
);

const DimensionsSubSchema = new Schema<IPackageDimensions>(
  {
    length: { type: Number, required: true, min: 0.1 },
    breadth: { type: Number, required: true, min: 0.1 },
    height: { type: Number, required: true, min: 0.1 }
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true, uppercase: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pickupAddress: { type: AddressSubSchema, required: true },
    dropAddress: { type: AddressSubSchema, required: true },
    pickupZone: { type: String, required: true, index: true },
    dropZone: { type: String, required: true, index: true },
    orderType: { type: String, enum: Object.values(CustomerType), required: true, index: true },
    paymentType: { type: String, enum: Object.values(PaymentType), required: true, index: true },
    packageDimensions: { type: DimensionsSubSchema, required: true },
    actualWeight: { type: Number, required: true, min: 0.01 },
    volumetricWeight: { type: Number, required: true, min: 0.01 },
    chargeableWeight: { type: Number, required: true, min: 0.01 },
    rateCardId: { type: Schema.Types.ObjectId, ref: 'RateCard' },
    baseCharge: { type: Number, required: true, min: 0 },
    codSurcharge: { type: Number, required: true, min: 0, default: 0 },
    totalCharge: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: 'DeliveryAgent', index: true },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.CREATED,
      index: true
    },
    failureReason: { type: String },
    failureNote: { type: String },
    scheduledDeliveryDate: { type: Date, required: true, default: Date.now },
    deliveredAt: { type: Date },
    assignmentDetails: {
      assignedAt: { type: Date },
      method: { type: String, enum: ['AUTO', 'MANUAL'] },
      reason: { type: String },
      distanceKm: { type: Number }
    },
    notes: { type: String }
  },
  {
    timestamps: true
  }
);

// Compound indexes for optimal querying & filtering
OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ assignedAgentId: 1, status: 1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ pickupZone: 1, dropZone: 1, status: 1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
