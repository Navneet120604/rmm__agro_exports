import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { companies } from './companies.js';

export const documentCounters = pgTable(
  'document_counters',
  {
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    documentType: varchar('document_type', { length: 32 }).notNull(), // 'PROFORMA', 'PRODUCTION_ORDER', 'INVOICE'
    financialYear: varchar('financial_year', { length: 16 }).notNull(), // '2026-27' or 'ALL'
    lastNumber: integer('last_number').default(0).notNull(),
    prefix: varchar('prefix', { length: 32 }).notNull(),
    suffix: varchar('suffix', { length: 32 }).default('').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.companyId, table.documentType, table.financialYear],
    }),
  ],
);

export type DocumentCounter = typeof documentCounters.$inferSelect;
export type NewDocumentCounter = typeof documentCounters.$inferInsert;
