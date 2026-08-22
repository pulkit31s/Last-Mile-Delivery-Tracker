import mongoose, { Document, Schema } from 'mongoose';
import { AgentAvailabilityStatus, VehicleType, ILocationCoordinates } from '../types';

export interface IDeliveryAgent extends Document {
  userId: mongoose.Types.ObjectId;
  employeeId: string;
  phone: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  availabilityStatus: AgentAvailabilityStatus;
  currentLocation?: ILocationCoordinates;
  currentZone?: string; // Zone code e.g. 'ZONE_NORTH'
  lastLocationUpdate?: Date;
  activeOrders: number;
  maxConcurrentOrders: number;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryAgentSchema = new Schema<IDeliveryAgent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    employeeId: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true },
    vehicleType: { type: String, enum: Object.values(VehicleType), default: VehicleType.BIKE },
    vehicleNumber: { type: String, required: true, trim: true },
    availabilityStatus: {
      type: String,
      enum: Object.values(AgentAvailabilityStatus),
      default: AgentAvailabilityStatus.AVAILABLE,
      index: true
    },
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number }
    },
    currentZone: { type: String, index: true },
    lastLocationUpdate: { type: Date },
    activeOrders: { type: Number, default: 0, min: 0 },
    maxConcurrentOrders: { type: Number, default: 5, min: 1 }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient auto-assignment lookups
DeliveryAgentSchema.index({ availabilityStatus: 1, currentZone: 1, activeOrders: 1 });

export const DeliveryAgent = mongoose.model<IDeliveryAgent>('DeliveryAgent', DeliveryAgentSchema);
