import mongoose, { Document, Schema } from 'mongoose';
import { NotificationChannel, NotificationStatus } from '../types';

export interface INotification extends Document {
  userId?: mongoose.Types.ObjectId;
  orderId?: string;
  channel: NotificationChannel;
  type: string; // e.g., 'ORDER_CREATED', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED'
  recipient: string; // Email address or phone number
  subject?: string;
  message: string;
  status: NotificationStatus;
  providerMessageId?: string;
  sentAt: Date;
  error?: string;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    orderId: { type: String, index: true },
    channel: { type: String, enum: Object.values(NotificationChannel), required: true },
    type: { type: String, required: true },
    recipient: { type: String, required: true },
    subject: { type: String },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.SENT,
      index: true
    },
    providerMessageId: { type: String },
    sentAt: { type: Date, default: Date.now, index: true },
    error: { type: String }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
