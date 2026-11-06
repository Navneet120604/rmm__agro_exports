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

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 64 }),
  contactPerson: varchar('contact_person', { length: 128 }),
  email: varchar('email', { length: 128 }),
  phone: varchar('phone', { length: 32 }),
  address: text('address').notNull(),
  city: varchar('city', { length: 64 }),
  country: varchar('country', { length: 64 }).notNull(),
  taxId: varchar('tax_id', { length: 64 }), // VAT / TRN / Registration Number
  isBuyer: boolean('is_buyer').default(true).notNull(),
  isConsignee: boolean('is_consignee').default(true).notNull(),
  isNotifyParty: boolean('is_notify_party').default(true).notNull(),
  version: integer('version').default(1).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
