import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { firms } from './tenancy.js';
import { documents, documentChunks, matters, subsets, transcriptSegments } from './matters.js';
import {
  contradictionStatusEnum,
  entityRelationStatusEnum,
  entityStatusEnum,
  eventStatusEnum,
  factOriginEnum,
  factStatusEnum,
  gapStatusEnum,
  issueStatusEnum,
  relevanceLabelEnum,
  relevanceScopeEnum,
  summaryStatusEnum,
  themeStatusEnum,
} from './enums.js';

export const facts = pgTable(
  'facts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    normalizedText: text('normalized_text').notNull(),
    factType: text('fact_type'),
    entityLabel: text('entity_label'),
    action: text('action'),
    object: text('object'),
    dateStart: date('date_start'),
    dateEnd: date('date_end'),
    datePrecision: text('date_precision'),
    dateText: text('date_text'),
    confidence: real('confidence'),
    status: factStatusEnum('status').notNull().default('proposed'),
    origin: factOriginEnum('origin').notNull().default('extracted'),
    manualReason: text('manual_reason'),
    mergedIntoId: uuid('merged_into_id').references((): AnyPgColumn => facts.id, {
      onDelete: 'set null',
    }),
    createdBy: text('created_by'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    archivedBy: text('archived_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('facts_matter_status_date_idx').on(table.matterId, table.status, table.dateStart),
    index('facts_matter_normalized_text_idx').on(table.matterId, table.normalizedText),
    index('facts_firm_id_idx').on(table.firmId),
    check(
      'facts_confidence_check',
      sql`${table.confidence} is null or (${table.confidence} >= 0 and ${table.confidence} <= 1)`,
    ),
    check(
      'facts_date_range_check',
      sql`${table.dateStart} is null or ${table.dateEnd} is null or ${table.dateEnd} >= ${table.dateStart}`,
    ),
  ],
);

export const issues = pgTable(
  'issues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    subsetId: uuid('subset_id').references(() => subsets.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    status: issueStatusEnum('status').notNull().default('open'),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('issues_matter_status_idx').on(table.matterId, table.status),
    index('issues_subset_status_idx').on(table.subsetId, table.status),
    index('issues_firm_id_idx').on(table.firmId),
  ],
);

export const factIssues = pgTable(
  'fact_issues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
    issueId: uuid('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),
    source: text('source').notNull().default('manual'),
  },
  (table) => [
    uniqueIndex('fact_issues_fact_issue_unique').on(table.factId, table.issueId),
    index('fact_issues_fact_idx').on(table.factId),
    index('fact_issues_issue_idx').on(table.issueId),
  ],
);

export const subsetIssues = pgTable(
  'subset_issues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    subsetId: uuid('subset_id')
      .notNull()
      .references(() => subsets.id, { onDelete: 'cascade' }),
    issueId: uuid('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('subset_issues_subset_issue_unique').on(table.subsetId, table.issueId),
    index('subset_issues_subset_idx').on(table.subsetId),
  ],
);

export const factRelevance = pgTable(
  'fact_relevance',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
    scopeType: relevanceScopeEnum('scope_type').notNull(),
    scopeId: uuid('scope_id').notNull(),
    label: relevanceLabelEnum('label').notNull().default('unclassified'),
    reason: text('reason'),
    updatedBy: text('updated_by').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('fact_relevance_fact_scope_unique').on(table.factId, table.scopeType, table.scopeId),
    index('fact_relevance_scope_idx').on(table.scopeType, table.scopeId, table.label),
  ],
);

export const themes = pgTable(
  'themes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    subsetId: uuid('subset_id').references(() => subsets.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    status: themeStatusEnum('status').notNull().default('draft'),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('themes_matter_status_idx').on(table.matterId, table.status),
    index('themes_subset_status_idx').on(table.subsetId, table.status),
  ],
);

export const themeFacts = pgTable(
  'theme_facts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    themeId: uuid('theme_id')
      .notNull()
      .references(() => themes.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('theme_facts_theme_fact_unique').on(table.themeId, table.factId)],
);

export const summaries = pgTable(
  'summaries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    subsetId: uuid('subset_id').references(() => subsets.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    status: summaryStatusEnum('status').notNull().default('draft'),
    content: jsonb('content').$type<Record<string, unknown>>().notNull().default({}),
    model: text('model'),
    promptHash: text('prompt_hash'),
    sourceHash: text('source_hash'),
    generatedAt: timestamp('generated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('summaries_matter_subset_created_idx').on(
      table.matterId,
      table.subsetId,
      table.createdAt,
    ),
  ],
);

export const summaryFacts = pgTable(
  'summary_facts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    summaryId: uuid('summary_id')
      .notNull()
      .references(() => summaries.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
  },
  (table) => [
    uniqueIndex('summary_facts_summary_fact_role_unique').on(
      table.summaryId,
      table.factId,
      table.role,
    ),
    index('summary_facts_summary_idx').on(table.summaryId),
    index('summary_facts_fact_idx').on(table.factId),
  ],
);

export const factSources = pgTable(
  'fact_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    chunkId: uuid('chunk_id').references(() => documentChunks.id, { onDelete: 'set null' }),
    transcriptSegmentId: uuid('transcript_segment_id').references(() => transcriptSegments.id, {
      onDelete: 'set null',
    }),
    pageNumber: integer('page_number'),
    mediaStartMs: integer('media_start_ms'),
    mediaEndMs: integer('media_end_ms'),
    sentenceStart: integer('sentence_start'),
    sentenceEnd: integer('sentence_end'),
    charStart: integer('char_start'),
    charEnd: integer('char_end'),
    quote: text('quote').notNull(),
    quoteHash: text('quote_hash').notNull(),
    sourceKind: text('source_kind').notNull().default('text'),
    verification: text('verification').notNull().default('unverified'),
    orphaned: boolean('orphaned').notNull().default(false),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('fact_sources_fact_idx').on(table.factId),
    index('fact_sources_document_idx').on(table.documentId),
    index('fact_sources_chunk_idx').on(table.chunkId),
    index('fact_sources_transcript_segment_idx').on(table.transcriptSegmentId),
  ],
);

export const factVersions = pgTable(
  'fact_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
    changedBy: text('changed_by').notNull(),
    changeReason: text('change_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('fact_versions_fact_version_unique').on(table.factId, table.version)],
);

export const entities = pgTable(
  'entities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    canonicalName: text('canonical_name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    type: text('type').notNull(),
    description: text('description'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    status: entityStatusEnum('status').notNull().default('proposed'),
    mergedIntoId: uuid('merged_into_id').references((): AnyPgColumn => entities.id, {
      onDelete: 'set null',
    }),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('entities_matter_type_idx').on(table.matterId, table.type),
    index('entities_firm_id_idx').on(table.firmId),
  ],
);

export const entityAliases = pgTable(
  'entity_aliases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    entityId: uuid('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    alias: text('alias').notNull(),
    normalizedAlias: text('normalized_alias').notNull(),
    source: text('source').notNull().default('extraction'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('entity_aliases_entity_alias_unique').on(table.entityId, table.normalizedAlias),
  ],
);

export const entityMentions = pgTable(
  'entity_mentions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    entityId: uuid('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id').references(() => facts.id, { onDelete: 'set null' }),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
    pageNumber: integer('page_number'),
    sentenceIndex: integer('sentence_index'),
    surfaceForm: text('surface_form').notNull(),
    roleInSentence: text('role_in_sentence'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('entity_mentions_entity_idx').on(table.entityId)],
);

export const entityRelations = pgTable(
  'entity_relations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    fromEntityId: uuid('from_entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    toEntityId: uuid('to_entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    relationType: text('relation_type').notNull(),
    description: text('description'),
    status: entityRelationStatusEnum('status').notNull().default('proposed'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('entity_relations_unique').on(
      table.fromEntityId,
      table.toEntityId,
      table.relationType,
    ),
  ],
);

export const entityRelationSources = pgTable(
  'entity_relation_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    relationId: uuid('relation_id')
      .notNull()
      .references(() => entityRelations.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('entity_relation_sources_unique').on(table.relationId, table.factId)],
);

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    dateStart: date('date_start'),
    dateEnd: date('date_end'),
    datePrecision: text('date_precision'),
    significance: text('significance'),
    status: eventStatusEnum('status').notNull().default('proposed'),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('events_matter_date_idx').on(table.matterId, table.dateStart),
    check(
      'events_date_range_check',
      sql`${table.dateStart} is null or ${table.dateEnd} is null or ${table.dateEnd} >= ${table.dateStart}`,
    ),
  ],
);

export const eventFacts = pgTable(
  'event_facts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('event_facts_unique').on(table.eventId, table.factId)],
);

export const eventEntities = pgTable(
  'event_entities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    entityId: uuid('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('event_entities_unique').on(table.eventId, table.entityId)],
);

export const contradictions = pgTable(
  'contradictions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    severity: text('severity').notNull(),
    confidence: real('confidence'),
    status: contradictionStatusEnum('status').notNull().default('candidate'),
    summary: text('summary').notNull(),
    reviewedBy: text('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    detectedBy: text('detected_by').notNull().default('workflow'),
    dedupKey: text('dedup_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('contradictions_matter_dedup_unique').on(table.matterId, table.dedupKey),
    index('contradictions_matter_status_severity_idx').on(
      table.matterId,
      table.status,
      table.severity,
    ),
  ],
);

export const contradictionFacts = pgTable(
  'contradiction_facts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    contradictionId: uuid('contradiction_id')
      .notNull()
      .references(() => contradictions.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
  },
  (table) => [
    uniqueIndex('contradiction_facts_unique').on(
      table.contradictionId,
      table.factId,
      table.role,
    ),
  ],
);

export const gaps = pgTable(
  'gaps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    status: gapStatusEnum('status').notNull().default('open'),
    severity: text('severity').notNull(),
    dateFrom: date('date_from'),
    dateTo: date('date_to'),
    summary: text('summary').notNull(),
    documentRef: text('document_ref'),
    dedupKey: text('dedup_key').notNull(),
    reviewedBy: text('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('gaps_matter_dedup_unique').on(table.matterId, table.dedupKey),
    index('gaps_matter_status_date_idx').on(table.matterId, table.status, table.dateFrom),
  ],
);

export const gapFacts = pgTable(
  'gap_facts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    gapId: uuid('gap_id')
      .notNull()
      .references(() => gaps.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('gap_facts_unique').on(table.gapId, table.factId)],
);
