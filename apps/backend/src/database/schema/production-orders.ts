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
import { companies } from './companies.js';
import { packingTypes } from './packing-types.js';
import { products } from './products.js';
import { proformaInvoices, proformaItems } from './proforma-invoices.js';
import { suppliers } from './suppliers.js';
import { users } from './users.js';

export const productionOrders = pgTable(
  'production_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    documentNumber: varchar('document_number', { length: 64 }).notNull(),
    documentDate: date('document_date').notNull(),
    proformaInvoiceId: uuid('proforma_invoice_id')
      .notNull()
      .references(() => proformaInvoices.id),
    buyerPoNumber: varchar('buyer_po_number', { length: 64 }),
    supplierMillId: uuid('supplier_mill_id').references(() => suppliers.id), // Rice mill
    millingInstructions: text('milling_instructions'),
    packagingInstructions: text('packaging_instructions'),
    dispatchSchedule: date('dispatch_schedule'),

    totalQuantityMt: numeric('total_quantity_mt', { precision: 12, scale: 3 })
      .default('0.000')
      .notNull(),
    allocatedInvoiceMt: numeric('allocated_invoice_mt', {
      precision: 12,
      scale: 3,
    })
      .default('0.000')
      .notNull(),

    status: varchar('status', { length: 32 }).default('PENDING').notNull(), // 'PENDING', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED'
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
    uniqueIndex('uq_po_company_number').on(
      table.companyId,
      table.documentNumber,
    ),
  ],
);

export const productionOrderItems = pgTable('production_order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  productionOrderId: uuid('production_order_id')
    .notNull()
    .references(() => productionOrders.id, { onDelete: 'cascade' }),
  proformaItemId: uuid('proforma_item_id')
    .notNull()
    .references(() => proformaItems.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  packingTypeId: uuid('packing_type_id')
    .notNull()
    .references(() => packingTypes.id),
  quantityMt: numeric('quantity_mt', { precision: 12, scale: 3 }).notNull(),
  allocatedInvoiceMt: numeric('allocated_invoice_mt', {
    precision: 12,
    scale: 3,
  })
    .default('0.000')
    .notNull(),
  specifications: text('specifications'),
});

export type ProductionOrder = typeof productionOrders.$inferSelect;
export type NewProductionOrder = typeof productionOrders.$inferInsert;
export type ProductionOrderItem = typeof productionOrderItems.$inferSelect;
export type NewProductionOrderItem = typeof productionOrderItems.$inferInsert;
