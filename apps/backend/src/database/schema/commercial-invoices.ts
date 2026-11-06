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
import { productionOrders } from './production-orders.js';
import { products } from './products.js';
import { proformaInvoices } from './proforma-invoices.js';
import { users } from './users.js';

export const commercialInvoices = pgTable(
  'commercial_invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    documentNumber: varchar('document_number', { length: 64 }).notNull(),
    documentDate: date('document_date').notNull(),
    financialYear: varchar('financial_year', { length: 16 }).notNull(), // e.g. "26-27"

    proformaInvoiceId: uuid('proforma_invoice_id').references(
      () => proformaInvoices.id,
    ),
    productionOrderId: uuid('production_order_id').references(
      () => productionOrders.id,
    ),
    buyerPoNumber: varchar('buyer_po_number', { length: 64 }),

    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id),
    consigneeId: uuid('consignee_id').references(() => customers.id),
    notifyPartyId: uuid('notify_party_id').references(() => customers.id),

    shippingBillNumber: varchar('shipping_bill_number', { length: 64 }),
    shippingBillDate: date('shipping_bill_date'),
    blNumber: varchar('bl_number', { length: 64 }),
    blDate: date('bl_date'),
    vesselFlightName: varchar('vessel_flight_name', { length: 128 }),
    voyageNumber: varchar('voyage_number', { length: 64 }),
    portOfLoading: varchar('port_of_loading', { length: 128 }).notNull(),
    portOfDischarge: varchar('port_of_discharge', { length: 128 }).notNull(),
    countryOfOrigin: varchar('country_of_origin', { length: 64 })
      .default('India')
      .notNull(),
    countryOfDestination: varchar('country_of_destination', {
      length: 64,
    }).notNull(),

    incoterm: varchar('incoterm', { length: 16 }).notNull(), // 'FOB', 'CFR', 'CIF'
    currency: varchar('currency', { length: 8 }).default('USD').notNull(),
    exchangeRate: numeric('exchange_rate', { precision: 12, scale: 4 })
      .default('1.0000')
      .notNull(),

    totalFobAmount: numeric('total_fob_amount', { precision: 15, scale: 2 })
      .default('0.00')
      .notNull(),
    oceanFreightAmount: numeric('ocean_freight_amount', {
      precision: 15,
      scale: 2,
    })
      .default('0.00')
      .notNull(),
    insuranceAmount: numeric('insurance_amount', { precision: 15, scale: 2 })
      .default('0.00')
      .notNull(),
    totalInvoiceAmount: numeric('total_invoice_amount', {
      precision: 15,
      scale: 2,
    })
      .default('0.00')
      .notNull(),
    amountInWords: text('amount_in_words').notNull(),

    lutNumber: varchar('lut_number', { length: 64 }),
    bankDetailsId: uuid('bank_details_id').references(() => bankDetails.id),
    frozenTerms: text('frozen_terms'),

    status: varchar('status', { length: 32 }).default('ISSUED').notNull(), // 'ISSUED', 'NEGOTIATED', 'PAID', 'CANCELLED'
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
    uniqueIndex('uq_inv_company_fy_number').on(
      table.companyId,
      table.financialYear,
      table.documentNumber,
    ),
  ],
);

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => commercialInvoices.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  packingTypeId: uuid('packing_type_id')
    .notNull()
    .references(() => packingTypes.id),
  quantityMt: numeric('quantity_mt', { precision: 12, scale: 3 }).notNull(),
  ratePerMt: numeric('rate_per_mt', { precision: 15, scale: 2 }).notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  specifications: text('specifications'),
});

// Rule 7: Incoterm-driven shipping charges
export const shippingCharges = pgTable('shipping_charges', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .unique()
    .references(() => commercialInvoices.id, { onDelete: 'cascade' }),
  incoterm: varchar('incoterm', { length: 16 }).notNull(),
  thcCharge: numeric('thc_charge', { precision: 12, scale: 2 }).default('0.00').notNull(),
  blCharge: numeric('bl_charge', { precision: 12, scale: 2 }).default('0.00').notNull(),
  sealCharge: numeric('seal_charge', { precision: 12, scale: 2 }).default('0.00').notNull(),
  mucCharge: numeric('muc_charge', { precision: 12, scale: 2 }).default('0.00').notNull(),
  riskCharge: numeric('risk_charge', { precision: 12, scale: 2 }).default('0.00').notNull(),
  repositionCharge: numeric('reposition_charge', { precision: 12, scale: 2 }).default('0.00').notNull(),
  oceanFreightCharge: numeric('ocean_freight_charge', { precision: 12, scale: 2 }).default('0.00').notNull(),
  insuranceCharge: numeric('insurance_charge', { precision: 12, scale: 2 }).default('0.00').notNull(),
  totalShippingCharge: numeric('total_shipping_charge', { precision: 12, scale: 2 }).default('0.00').notNull(),
});

// Containers feeding the Packing List
export const containers = pgTable('containers', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => commercialInvoices.id, { onDelete: 'cascade' }),
  containerNumber: varchar('container_number', { length: 32 }).notNull(),
  sealNumber: varchar('seal_number', { length: 32 }).notNull(),
  containerSize: varchar('container_size', { length: 16 }).default('20FT').notNull(),
  totalBags: integer('total_bags').notNull(),
  grossWeightKg: numeric('gross_weight_kg', { precision: 12, scale: 3 }).notNull(),
  netWeightKg: numeric('net_weight_kg', { precision: 12, scale: 3 }).notNull(),
});

export type CommercialInvoice = typeof commercialInvoices.$inferSelect;
export type NewCommercialInvoice = typeof commercialInvoices.$inferInsert;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;
export type ShippingCharge = typeof shippingCharges.$inferSelect;
export type NewShippingCharge = typeof shippingCharges.$inferInsert;
export type Container = typeof containers.$inferSelect;
export type NewContainer = typeof containers.$inferInsert;
