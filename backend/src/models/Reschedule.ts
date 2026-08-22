import mongoose, { Document, Schema } from 'mongoose';

export interface IReschedule extends Document {
  orderId: string;
  orderDocId: mongoose.Types.ObjectId;
  previousDeliveryDate: Date;
  newDeliveryDate: Date;
  requestedBy: mongoose.Types.ObjectId;
  reason: string;
  previousAgentId?: mongoose.Types.ObjectId;
  reassignedAgentId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const RescheduleSchema = new Schema<IReschedule>(
  {
    orderId: { type: String, required: true, index: true },
    orderDocId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    previousDeliveryDate: { type: Date, required: true },
    newDeliveryDate: { type: Date, required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true },
    previousAgentId: { type: Schema.Types.ObjectId, ref: 'DeliveryAgent' },
    reassignedAgentId: { type: Schema.Types.ObjectId, ref: 'DeliveryAgent' }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export const Reschedule = mongoose.model<IReschedule>('Reschedule', RescheduleSchema);
