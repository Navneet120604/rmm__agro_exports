import {
  pgTable,
  uuid,
  boolean,
  timestamp,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { companies } from './companies.js';

export const userCompanies = pgTable(
  'user_companies',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.companyId] })],
);

export type UserCompany = typeof userCompanies.$inferSelect;
export type NewUserCompany = typeof userCompanies.$inferInsert;
