import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { firms } from './tenancy.js';
import { matters, subsets } from './matters.js';
import { facts } from './intelligence.js';
import { outputStatusEnum } from './enums.js';

export const outputs = pgTable(
  'outputs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    subsetId: uuid('subset_id').references(() => subsets.id, { onDelete: 'set null' }),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    status: outputStatusEnum('status').notNull().default('draft'),
    currentVersion: integer('current_version').notNull().default(1),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('outputs_matter_idx').on(table.matterId)],
);

export const outputVersions = pgTable(
  'output_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    outputId: uuid('output_id')
      .notNull()
      .references(() => outputs.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    content: jsonb('content').$type<Record<string, unknown>>().notNull().default({}),
    contentMarkdown: text('content_markdown'),
    finalizedBy: text('finalized_by'),
    finalizedAt: timestamp('finalized_at', { withTimezone: true }),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('output_versions_output_version_unique').on(table.outputId, table.version)],
);

export const outputSources = pgTable(
  'output_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    outputVersionId: uuid('output_version_id')
      .notNull()
      .references(() => outputVersions.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
    citationSnapshot: jsonb('citation_snapshot').$type<Record<string, unknown>>().notNull(),
  },
  (table) => [
    uniqueIndex('output_sources_version_fact_unique').on(table.outputVersionId, table.factId),
  ],
);

export const outputTemplates = pgTable(
  'output_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    name: text('name').notNull(),
    bodyMarkdown: text('body_markdown').notNull(),
    placeholders: jsonb('placeholders').$type<unknown[]>().notNull().default([]),
    version: integer('version').notNull().default(1),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('output_templates_firm_name_version_unique').on(
      table.firmId,
      table.name,
      table.version,
    ),
  ],
);

export const threads = pgTable(
  'threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id').references(() => matters.id, { onDelete: 'cascade' }),
    subsetId: uuid('subset_id').references(() => subsets.id, { onDelete: 'set null' }),
    userId: text('user_id').notNull(),
    scope: text('scope').notNull(),
    title: text('title'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('threads_firm_user_updated_idx').on(table.firmId, table.userId, table.updatedAt),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id').references(() => matters.id, { onDelete: 'cascade' }),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => threads.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    responseEnvelope: jsonb('response_envelope').$type<Record<string, unknown>>(),
    runMetadata: jsonb('run_metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('messages_thread_idx').on(table.threadId)],
);

export const messageSources = pgTable(
  'message_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id').notNull(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
    citationSnapshot: jsonb('citation_snapshot').$type<Record<string, unknown>>().notNull(),
  },
  (table) => [uniqueIndex('message_sources_message_fact_unique').on(table.messageId, table.factId)],
);
