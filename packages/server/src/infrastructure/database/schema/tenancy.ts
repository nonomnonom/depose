import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { matters } from './matters.js';
import {
  domainSslStatusEnum,
  domainStatusEnum,
  domainTypeEnum,
  matterAccessEnum,
} from './enums.js';

export const firms = pgTable(
  'firms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: text('organization_id').notNull().unique(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    primaryLanguage: text('primary_language').notNull().default('id'),
    jurisdiction: text('jurisdiction').notNull().default('ID'),
    defaultTimezone: text('default_timezone').notNull().default('UTC'),
    ownerId: text('owner_id').notNull(),
    settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('firms_owner_id_idx').on(table.ownerId)],
);

export const firmDomains = pgTable(
  'firm_domains',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    hostname: text('hostname').notNull(),
    domainType: domainTypeEnum('domain_type').notNull().default('subdomain'),
    isPrimary: boolean('is_primary').notNull().default(false),
    status: domainStatusEnum('status').notNull().default('pending'),
    verificationTokenHash: text('verification_token_hash'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
    lastError: text('last_error'),
    sslStatus: domainSslStatusEnum('ssl_status').notNull().default('pending'),
    sslExpiresAt: timestamp('ssl_expires_at', { withTimezone: true }),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('firm_domains_hostname_unique').on(sql`lower(${table.hostname})`),
    index('firm_domains_firm_status_idx').on(table.firmId, table.status),
    uniqueIndex('firm_domains_primary_unique')
      .on(table.firmId)
      .where(sql`${table.isPrimary} = true`),
  ],
);

export const matterMembers = pgTable(
  'matter_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    access: matterAccessEnum('access').notNull().default('viewer'),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('matter_members_matter_user_unique').on(table.matterId, table.userId),
    index('matter_members_firm_id_idx').on(table.firmId),
  ],
);

export const matterShares = pgTable(
  'matter_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    resourceType: text('resource_type').notNull(),
    resourceId: uuid('resource_id').notNull(),
    userId: text('user_id').notNull(),
    permission: text('permission').notNull().default('read'),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('matter_shares_resource_user_unique').on(
      table.resourceType,
      table.resourceId,
      table.userId,
    ),
    index('matter_shares_firm_id_idx').on(table.firmId),
  ],
);

export const onboardingProgress = pgTable(
  'onboarding_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('onboarding_progress_firm_user_unique').on(table.firmId, table.userId)],
);

export type Firm = typeof firms.$inferSelect;
export type FirmDomain = typeof firmDomains.$inferSelect;
export type MatterMember = typeof matterMembers.$inferSelect;
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
