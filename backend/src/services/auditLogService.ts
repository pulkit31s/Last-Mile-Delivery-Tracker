import { AuditLog, IAuditLog } from '../models/AuditLog';
import { AuditAction, UserRole } from '../types';
import { logger } from '../config/logger';

export interface IRecordAuditInput {
  actor?: {
    _id?: any;
    role?: UserRole | 'SYSTEM';
    name?: string;
    email?: string;
  };
  action: AuditAction | string;
  entityType: string;
  entityId: string;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogService {
  /**
   * Records an immutable audit log entry.
   */
  static async record(input: IRecordAuditInput): Promise<IAuditLog> {
    try {
      const log = await AuditLog.create({
        actorId: input.actor?._id,
        actorRole: input.actor?.role || 'SYSTEM',
        actorName: input.actor?.name,
        actorEmail: input.actor?.email,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        previousValue: input.previousValue,
        newValue: input.newValue,
        reason: input.reason,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        timestamp: new Date()
      });

      logger.info(`[AuditLog] ${input.action} on ${input.entityType}:${input.entityId} by ${input.actor?.email || 'SYSTEM'}`);
      return log;
    } catch (err: any) {
      logger.error(`Failed to record audit log: ${err.message}`);
      throw err;
    }
  }

  /**
   * Retrieves paginated audit logs for admin inspection.
   */
  static async getLogs(options: { page?: number; limit?: number; entityType?: string; entityId?: string }) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const query: any = {};
    if (options.entityType) query.entityType = options.entityType;
    if (options.entityId) query.entityId = options.entityId;

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query)
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}
