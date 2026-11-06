import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { companies } from './companies.js';

export const termsAndConditions = pgTable('terms_and_conditions', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'restrict' }),
  title: varchar('title', { length: 128 }).notNull(),
  documentType: varchar('document_type', { length: 32 }).notNull(), // 'PROFORMA', 'INVOICE', 'PRODUCTION_ORDER'
  content: text('content').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  version: integer('version').default(1).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type TermsAndCondition = typeof termsAndConditions.$inferSelect;
export type NewTermsAndCondition = typeof termsAndConditions.$inferInsert;
