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

export const bankDetails = pgTable('bank_details', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'restrict' }),
  bankName: varchar('bank_name', { length: 128 }).notNull(),
  accountName: varchar('account_name', { length: 128 }).notNull(),
  accountNumber: varchar('account_number', { length: 64 }).notNull(),
  ifscCode: varchar('ifsc_code', { length: 16 }),
  swiftCode: varchar('swift_code', { length: 16 }).notNull(),
  adCode: varchar('ad_code', { length: 32 }).notNull(), // Authorized Dealer Code for Indian Customs
  branchAddress: text('branch_address').notNull(),
  currency: varchar('currency', { length: 8 }).default('USD').notNull(),
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

export type BankDetail = typeof bankDetails.$inferSelect;
export type NewBankDetail = typeof bankDetails.$inferInsert;
