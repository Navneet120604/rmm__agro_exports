import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { companies } from './companies.js';

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 128 }).notNull(), // e.g. "1121 Creamy Sella Basmati Rice"
  code: varchar('code', { length: 64 }),
  hsnCode: varchar('hsn_code', { length: 16 }).default('10063020').notNull(),
  variety: varchar('variety', { length: 64 }).notNull(), // '1121', '1509', 'Sugandha', 'Sharbati', 'PR11'
  processingType: varchar('processing_type', { length: 32 }).notNull(), // 'STEAM', 'SELLA_CREAMY', 'SELLA_GOLDEN', 'RAW'
  defaultBrokenPercentage: numeric('default_broken_percentage', {
    precision: 5,
    scale: 2,
  })
    .default('1.00')
    .notNull(),
  grainLengthMm: numeric('grain_length_mm', { precision: 5, scale: 2 }).default(
    '8.35',
  ),
  moistureMaxPercentage: numeric('moisture_max_percentage', {
    precision: 5,
    scale: 2,
  }).default('12.50'),
  purityPercentage: numeric('purity_percentage', {
    precision: 5,
    scale: 2,
  }).default('95.00'),
  description: text('description'),
  version: integer('version').default(1).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
