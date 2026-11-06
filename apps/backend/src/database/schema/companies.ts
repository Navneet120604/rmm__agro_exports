import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 16 }).notNull().unique(), // e.g. 'RMM', 'PRAGATI', 'DUDANI'
  name: varchar('name', { length: 128 }).notNull(),
  legalName: varchar('legal_name', { length: 255 }).notNull(),
  gstin: varchar('gstin', { length: 15 }),
  iecCode: varchar('iec_code', { length: 32 }),
  panNumber: varchar('pan_number', { length: 10 }),
  lutNumber: varchar('lut_number', { length: 64 }),
  adCode: varchar('ad_code', { length: 32 }),
  addressLine1: varchar('address_line1', { length: 255 }).notNull(),
  addressLine2: varchar('address_line2', { length: 255 }),
  city: varchar('city', { length: 64 }).notNull(),
  state: varchar('state', { length: 64 }).notNull(),
  country: varchar('country', { length: 64 }).notNull().default('India'),
  pincode: varchar('pincode', { length: 16 }).notNull(),
  contactPhone: varchar('contact_phone', { length: 32 }),
  contactEmail: varchar('contact_email', { length: 128 }),
  logoPath: varchar('logo_path', { length: 255 }),
  signaturePath: varchar('signature_path', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
