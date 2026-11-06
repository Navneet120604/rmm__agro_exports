import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { companies } from './companies.js';
import { users } from './users.js';

export const activityLogs = pgTable('activity_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, {
    onDelete: 'set null',
  }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  username: varchar('username', { length: 64 }).notNull(),
  action: varchar('action', { length: 32 }).notNull(), // 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'SWITCH_COMPANY'
  entityTable: varchar('entity_table', { length: 64 }).notNull(),
  entityId: varchar('entity_id', { length: 64 }).notNull(),
  changedFields: jsonb('changed_fields').$type<string[]>(),
  previousValues: jsonb('previous_values').$type<Record<string, unknown>>(),
  newValues: jsonb('new_values').$type<Record<string, unknown>>(),
  deletionReason: text('deletion_reason'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
