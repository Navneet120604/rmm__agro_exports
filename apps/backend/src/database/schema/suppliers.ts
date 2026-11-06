import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { companies } from './companies.js';

export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 255 }).notNull(),
  supplierType: varchar('supplier_type', { length: 32 }).notNull(), // 'MILL', 'PACKAGING', 'TRANSPORT', 'FUMIGATION', 'OTHER'
  contactPerson: varchar('contact_person', { length: 128 }),
  phone: varchar('phone', { length: 32 }),
  email: varchar('email', { length: 128 }),
  address: text('address'),
  city: varchar('city', { length: 64 }),
  state: varchar('state', { length: 64 }),
  gstin: varchar('gstin', { length: 15 }),
  version: integer('version').default(1).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
