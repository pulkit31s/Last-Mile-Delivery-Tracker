import mongoose, { Document, Schema } from 'mongoose';
import { AuditAction, UserRole } from '../types';

export interface IAuditLog extends Document {
  actorId?: mongoose.Types.ObjectId;
  actorRole: UserRole | 'SYSTEM';
  actorName?: string;
  actorEmail?: string;
  action: AuditAction | string;
  entityType: string; // e.g., 'Order', 'RateCard', 'Zone', 'Area'
  entityId: string;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorRole: { type: String, required: true },
    actorName: { type: String },
    actorEmail: { type: String },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    previousValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    reason: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  {
    timestamps: { createdAt: true, updatedAt: false } // Immutable audit logs
  }
);

AuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
