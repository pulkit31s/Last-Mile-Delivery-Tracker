import mongoose, { Document, Schema } from 'mongoose';

export interface IZone extends Document {
  name: string;
  code: string; // e.g., 'ZONE_NORTH', 'ZONE_SOUTH'
  description?: string;
  cities: string[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const ZoneSchema = new Schema<IZone>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, trim: true },
    cities: [{ type: String, trim: true }],
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true }
  },
  {
    timestamps: true
  }
);

export const Zone = mongoose.model<IZone>('Zone', ZoneSchema);
