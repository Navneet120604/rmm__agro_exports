import {
  pgTable,
  uuid,
  varchar,
  date,
  text,
  numeric,
  integer,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { bankDetails } from './bank-details.js';
import { companies } from './companies.js';
import { customers } from './customers.js';
import { packingTypes } from './packing-types.js';
import { products } from './products.js';
import { users } from './users.js';

export const proformaInvoices = pgTable(
  'proforma_invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    documentNumber: varchar('document_number', { length: 64 }).notNull(),
    documentDate: date('document_date').notNull(),
    financialYear: varchar('financial_year', { length: 16 }).notNull(),

    // Legacy Swap Gotcha: Consignee in customer_id, Buyer in consignee_id
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id),
    consigneeId: uuid('consignee_id').references(() => customers.id),
    notifyPartyId: uuid('notify_party_id').references(() => customers.id),

    incoterm: varchar('incoterm', { length: 16 }).notNull(), // 'FOB', 'CFR', 'CIF'
    currency: varchar('currency', { length: 8 }).default('USD').notNull(),
    exchangeRate: numeric('exchange_rate', { precision: 12, scale: 4 })
      .default('1.0000')
      .notNull(),

    portOfLoading: varchar('port_of_loading', { length: 128 }).notNull(),
    portOfDischarge: varchar('port_of_discharge', { length: 128 }).notNull(),
    finalDestination: varchar('final_destination', { length: 128 }).notNull(),
    paymentTerms: text('payment_terms').notNull(),
    frozenTerms: text('frozen_terms'), // Snapshotted terms
    bankDetailsId: uuid('bank_details_id').references(() => bankDetails.id),

    totalQuantityMt: numeric('total_quantity_mt', { precision: 12, scale: 3 })
      .default('0.000')
      .notNull(),
    totalAmount: numeric('total_amount', { precision: 15, scale: 2 })
      .default('0.00')
      .notNull(),

    status: varchar('status', { length: 32 }).default('CONFIRMED').notNull(), // 'DRAFT', 'CONFIRMED', 'FULFILLED', 'CANCELLED'
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
  },
  (table) => [
    uniqueIndex('uq_pi_company_number').on(
      table.companyId,
      table.documentNumber,
    ),
  ],
);

export const proformaItems = pgTable('proforma_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  proformaInvoiceId: uuid('proforma_invoice_id')
    .notNull()
    .references(() => proformaInvoices.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  packingTypeId: uuid('packing_type_id')
    .notNull()
    .references(() => packingTypes.id),
  quantityMt: numeric('quantity_mt', { precision: 12, scale: 3 }).notNull(),
  allocatedProductionMt: numeric('allocated_production_mt', {
    precision: 12,
    scale: 3,
  })
    .default('0.000')
    .notNull(),
  ratePerMt: numeric('rate_per_mt', { precision: 15, scale: 2 }).notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  specifications: text('specifications'),
});

export type ProformaInvoice = typeof proformaInvoices.$inferSelect;
export type NewProformaInvoice = typeof proformaInvoices.$inferInsert;
export type ProformaItem = typeof proformaItems.$inferSelect;
export type NewProformaItem = typeof proformaItems.$inferInsert;
