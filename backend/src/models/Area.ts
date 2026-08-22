import mongoose, { Document, Schema } from 'mongoose';

export interface IArea extends Document {
  name: string;
  code: string;
  pincode: string;
  city: string;
  state: string;
  zoneId: mongoose.Types.ObjectId;
  zoneCode: string; // denormalized for ultra-fast lookup
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const AreaSchema = new Schema<IArea>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    pincode: { type: String, required: true, unique: true, trim: true, index: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zoneId: { type: Schema.Types.ObjectId, ref: 'Zone', required: true, index: true },
    zoneCode: { type: String, required: true, uppercase: true, index: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true }
  },
  {
    timestamps: true
  }
);

AreaSchema.index({ pincode: 1, status: 1 });

export const Area = mongoose.model<IArea>('Area', AreaSchema);
