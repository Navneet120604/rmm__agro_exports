import {
  pgTable,
  uuid,
  varchar,
  date,
  text,
  numeric,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { bankDetails } from './bank-details.js';
import { commercialInvoices } from './commercial-invoices.js';
import { companies } from './companies.js';
import { customers } from './customers.js';
import { users } from './users.js';

export const receipts = pgTable('receipts', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'restrict' }),
  receiptNumber: varchar('receipt_number', { length: 64 }).notNull(),
  receiptDate: date('receipt_date').notNull(),
  financialYear: varchar('financial_year', { length: 16 }).notNull(),

  commercialInvoiceId: uuid('commercial_invoice_id')
    .notNull()
    .references(() => commercialInvoices.id),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),

  amountReceived: numeric('amount_received', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 8 }).default('USD').notNull(),
  exchangeRate: numeric('exchange_rate', { precision: 12, scale: 4 })
    .default('1.0000')
    .notNull(),
  bankDetailsId: uuid('bank_details_id').references(() => bankDetails.id),

  paymentMode: varchar('payment_mode', { length: 32 }).notNull(), // 'WIRE_TRANSFER', 'LC_NEGOTIATION', 'CHEQUE', 'OTHER'
  referenceNumber: varchar('reference_number', { length: 64 }), // UTR / Swift ref
  remarks: text('remarks'),

  version: integer('version').default(1).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  updatedBy: uuid('updated_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;
