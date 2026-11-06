import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { companies } from './companies.js';

export const packingTypes = pgTable('packing_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 128 }).notNull(), // e.g. "30KG BOPP BAGS", "50KG JUTE BAGS"
  material: varchar('material', { length: 32 }).notNull(), // 'BOPP', 'NON_WOVEN', 'JUTE', 'POUCH', 'PAPER'
  weightKg: numeric('weight_kg', { precision: 8, scale: 3 }).notNull(), // e.g. 30.000, 50.000
  version: integer('version').default(1).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type PackingType = typeof packingTypes.$inferSelect;
export type NewPackingType = typeof packingTypes.$inferInsert;
