import { Injectable, Logger } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import {
  activityLogs,
  type NewActivityLog,
} from '../../database/schema/activity-logs.js';

export interface LogParams {
  companyId?: string | null;
  userId?: string | null;
  username: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'SWITCH_COMPANY';
  entityTable: string;
  entityId: string;
  changedFields?: string[];
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  deletionReason?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Records an audit event into activity_logs.
   * Can run within an existing database transaction to guarantee atomic commitment.
   */
  async record(params: LogParams, tx?: any): Promise<void> {
    if (!this.databaseService.isConnected) {
      this.logger.log(
        `[AUDIT MOCK] ${params.action} on ${params.entityTable}:${params.entityId} by ${params.username}`,
      );
      return;
    }

    const executor = tx || this.databaseService.db;

    const entry: NewActivityLog = {
      companyId: params.companyId ?? null,
      userId: params.userId ?? null,
      username: params.username,
      action: params.action,
      entityTable: params.entityTable,
      entityId: params.entityId,
      changedFields: params.changedFields ?? null,
      previousValues: params.previousValues ?? null,
      newValues: params.newValues ?? null,
      deletionReason: params.deletionReason ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    };

    try {
      await executor.insert(activityLogs).values(entry);
    } catch (err) {
      this.logger.error(
        `Failed to record activity log: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`,
      );
      // Re-throw in transactional context to ensure audit and business logic commit atomically
      if (tx) {
        throw err;
      }
    }
  }

  async findByCompany(
    companyId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    if (!this.databaseService.isConnected) {
      return [];
    }

    return this.databaseService.db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.companyId, companyId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }
}
