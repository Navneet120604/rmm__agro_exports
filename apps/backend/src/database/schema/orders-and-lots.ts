import {
  pgTable,
  uuid,
  varchar,
  date,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { commercialInvoices } from './commercial-invoices.js';
import { companies } from './companies.js';
import { proformaInvoices } from './proforma-invoices.js';
import { users } from './users.js';

export const masterOrders = pgTable('master_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'restrict' }),
  orderNumber: varchar('order_number', { length: 64 }).notNull(),
  orderDate: date('order_date').notNull(),
  proformaInvoiceId: uuid('proforma_invoice_id').references(
    () => proformaInvoices.id,
  ),
  buyerPoNumber: varchar('buyer_po_number', { length: 64 }),
  lcNumber: varchar('lc_number', { length: 64 }),
  lcDate: date('lc_date'),
  lcExpiryDate: date('lc_expiry_date'),
  issuingBank: varchar('issuing_bank', { length: 128 }),
  totalQuantityMt: numeric('total_quantity_mt', { precision: 12, scale: 3 }).notNull(),
  status: varchar('status', { length: 32 }).default('ACTIVE').notNull(), // 'ACTIVE', 'COMPLETED', 'CANCELLED'
  version: integer('version').default(1).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const orderLots = pgTable('order_lots', {
  id: uuid('id').defaultRandom().primaryKey(),
  masterOrderId: uuid('master_order_id')
    .notNull()
    .references(() => masterOrders.id, { onDelete: 'cascade' }),
  lotNumber: integer('lot_number').notNull(),
  quantityMt: numeric('quantity_mt', { precision: 12, scale: 3 }).notNull(),
  commercialInvoiceId: uuid('commercial_invoice_id').references(
    () => commercialInvoices.id,
  ),
  status: varchar('status', { length: 32 }).default('PLANNED').notNull(), // 'PLANNED', 'DISPATCHED', 'INVOICED'
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const documentHubItems = pgTable('document_hub_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  masterOrderId: uuid('master_order_id')
    .notNull()
    .references(() => masterOrders.id, { onDelete: 'cascade' }),
  lotId: uuid('lot_id').references(() => orderLots.id, {
    onDelete: 'cascade',
  }),
  documentType: varchar('document_type', { length: 64 }).notNull(), // 'COMMERCIAL_INVOICE', 'PACKING_LIST', 'BILL_OF_LADING', 'CERT_ORIGIN', 'HEALTH_CERT', 'BILL_OF_EXCHANGE'
  classification: varchar('classification', { length: 32 }).notNull(), // 'GENERATED' | 'COLLECTED'
  status: varchar('status', { length: 32 }).default('PENDING').notNull(), // 'PENDING', 'DRAFTED', 'COLLECTED', 'VERIFIED'
  filePath: text('file_path'),
  isVerified: boolean('is_verified').default(false).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type MasterOrder = typeof masterOrders.$inferSelect;
export type NewMasterOrder = typeof masterOrders.$inferInsert;
export type OrderLot = typeof orderLots.$inferSelect;
export type NewOrderLot = typeof orderLots.$inferInsert;
export type DocumentHubItem = typeof documentHubItems.$inferSelect;
export type NewDocumentHubItem = typeof documentHubItems.$inferInsert;
