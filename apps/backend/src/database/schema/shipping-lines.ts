import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { companies } from './companies.js';

export const shippingLines = pgTable('shipping_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 128 }).notNull(), // e.g. "Maersk Line", "MSC", "CMA CGM"
  code: varchar('code', { length: 32 }),
  contactDetails: text('contact_details'),
  version: integer('version').default(1).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ShippingLine = typeof shippingLines.$inferSelect;
export type NewShippingLine = typeof shippingLines.$inferInsert;
