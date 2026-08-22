import mongoose, { Document, Schema } from 'mongoose';
import { OrderStatus, UserRole, ILocationCoordinates } from '../types';

export interface ITrackingEvent extends Document {
  orderId: string; // Order human-readable code or reference
  orderDocId: mongoose.Types.ObjectId; // MongoDB ObjectId of the Order
  status: OrderStatus;
  timestamp: Date;
  actorId?: mongoose.Types.ObjectId;
  actorRole: UserRole | 'SYSTEM';
  actorName?: string;
  location?: ILocationCoordinates & { addressText?: string };
  note?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const TrackingEventSchema = new Schema<ITrackingEvent>(
  {
    orderId: { type: String, required: true, index: true },
    orderDocId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    status: { type: String, enum: Object.values(OrderStatus), required: true, index: true },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String, required: true },
    actorName: { type: String },
    location: {
      lat: { type: Number },
      lng: { type: Number },
      addressText: { type: String }
    },
    note: { type: String },
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: { createdAt: true, updatedAt: false } // Immutable: no updatedAt
  }
);

// Append-only history index
TrackingEventSchema.index({ orderDocId: 1, timestamp: 1 });
TrackingEventSchema.index({ orderId: 1, timestamp: 1 });

export const TrackingEvent = mongoose.model<ITrackingEvent>('TrackingEvent', TrackingEventSchema);
