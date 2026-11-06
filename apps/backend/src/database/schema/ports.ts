import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { companies } from './companies.js';

export const ports = pgTable('ports', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 128 }).notNull(), // e.g. "Mundra Port", "Jebel Ali"
  code: varchar('code', { length: 32 }), // UN/LOCODE: "INMUN", "AEJEA"
  portType: varchar('port_type', { length: 16 }).notNull(), // 'LOADING', 'DISCHARGE', 'BOTH'
  country: varchar('country', { length: 64 }).notNull(),
  version: integer('version').default(1).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Port = typeof ports.$inferSelect;
export type NewPort = typeof ports.$inferInsert;
