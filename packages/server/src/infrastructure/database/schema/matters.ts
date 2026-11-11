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
import { entities } from './intelligence.js';
import {
  documentProcessingStatusEnum,
  embeddingStatusEnum,
  matterStatusEnum,
  mediaAssetStatusEnum,
  mediaKindEnum,
  transcriptSegmentStatusEnum,
} from './enums.js';

export const matters = pgTable(
  'matters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    matterNumber: text('matter_number'),
    type: text('type').notNull().default('other'),
    status: matterStatusEnum('status').notNull().default('active'),
    openedDate: date('opened_date'),
    closedDate: date('closed_date'),
    description: text('description'),
    leadLawyerId: text('lead_lawyer_id'),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('matters_firm_id_idx').on(table.firmId),
    index('matters_firm_status_updated_idx').on(table.firmId, table.status, table.updatedAt),
    uniqueIndex('matters_firm_matter_number_unique')
      .on(table.firmId, table.matterNumber)
      .where(sql`${table.matterNumber} is not null`),
  ],
);

export const subsets = pgTable(
  'subsets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    applyMatterIssues: boolean('apply_matter_issues').notNull().default(true),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('subsets_matter_name_unique').on(table.matterId, sql`lower(${table.name})`),
    index('subsets_firm_id_idx').on(table.firmId),
  ],
);

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    parentDocumentId: uuid('parent_document_id').references((): AnyPgColumn => documents.id, {
      onDelete: 'set null',
    }),
    fileName: text('file_name').notNull(),
    storageKey: text('storage_key').notNull().unique(),
    sha256: text('sha256').notNull(),
    duplicateOfId: uuid('duplicate_of_id'),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    type: text('type').notNull(),
    source: text('source').notNull().default('upload'),
    uploadedBy: text('uploaded_by').notNull(),
    pageCount: integer('page_count'),
    language: text('language'),
    processingStatus: documentProcessingStatusEnum('processing_status').notNull().default('queued'),
    processingError: text('processing_error'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    isPrivileged: boolean('is_privileged').notNull().default(false),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('documents_matter_sha256_idx').on(table.matterId, table.sha256),
    index('documents_matter_processing_idx').on(table.matterId, table.processingStatus),
    index('documents_parent_document_idx').on(table.parentDocumentId),
    index('documents_firm_id_idx').on(table.firmId),
  ],
);

export const documentPages = pgTable(
  'document_pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    pageNumber: integer('page_number').notNull(),
    text: text('text').notNull(),
    charCount: integer('char_count').notNull(),
    ocrBlocks: jsonb('ocr_blocks').$type<unknown[]>(),
    ocrConfidence: real('ocr_confidence'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('document_pages_document_page_unique').on(table.documentId, table.pageNumber),
    index('document_pages_matter_id_idx').on(table.matterId),
    check(
      'document_pages_ocr_confidence_check',
      sql`${table.ocrConfidence} is null or (${table.ocrConfidence} >= 0 and ${table.ocrConfidence} <= 1)`,
    ),
  ],
);

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    kind: mediaKindEnum('kind').notNull().default('audio'),
    durationMs: integer('duration_ms').notNull(),
    codec: text('codec'),
    sampleRate: integer('sample_rate'),
    channels: integer('channels'),
    language: text('language'),
    consentConfirmedBy: text('consent_confirmed_by').notNull(),
    consentConfirmedAt: timestamp('consent_confirmed_at', { withTimezone: true }).notNull(),
    transcriptionModel: text('transcription_model'),
    status: mediaAssetStatusEnum('status').notNull().default('uploaded'),
    errorCode: text('error_code'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('media_assets_document_unique').on(table.documentId),
    index('media_assets_matter_status_idx').on(table.matterId, table.status),
    check('media_assets_duration_check', sql`${table.durationMs} > 0`),
  ],
);

export const transcriptSegments = pgTable(
  'transcript_segments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    mediaAssetId: uuid('media_asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    segmentIndex: integer('segment_index').notNull(),
    startMs: integer('start_ms').notNull(),
    endMs: integer('end_ms').notNull(),
    speakerLabel: text('speaker_label'),
    speakerEntityId: uuid('speaker_entity_id').references((): AnyPgColumn => entities.id, {
      onDelete: 'set null',
    }),
    text: text('text').notNull(),
    confidence: real('confidence'),
    language: text('language'),
    status: transcriptSegmentStatusEnum('status').notNull().default('draft'),
    editedBy: text('edited_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('transcript_segments_document_index_unique').on(
      table.documentId,
      table.segmentIndex,
    ),
    index('transcript_segments_matter_speaker_idx').on(table.matterId, table.speakerEntityId),
    index('transcript_segments_firm_id_idx').on(table.firmId),
    check('transcript_segments_time_check', sql`${table.endMs} > ${table.startMs}`),
  ],
);

export const documentChunks = pgTable(
  'document_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    matterId: uuid('matter_id')
      .notNull()
      .references(() => matters.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    pageNumber: integer('page_number'),
    transcriptSegmentId: uuid('transcript_segment_id').references(() => transcriptSegments.id, {
      onDelete: 'set null',
    }),
    mediaStartMs: integer('media_start_ms'),
    mediaEndMs: integer('media_end_ms'),
    sentenceStart: integer('sentence_start'),
    sentenceEnd: integer('sentence_end'),
    charStart: integer('char_start').notNull(),
    charEnd: integer('char_end').notNull(),
    content: text('content').notNull(),
    contentHash: text('content_hash').notNull(),
    chunkVersion: integer('chunk_version').notNull().default(1),
    embeddingStatus: embeddingStatusEnum('embedding_status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('document_chunks_version_index_unique').on(
      table.documentId,
      table.chunkVersion,
      table.chunkIndex,
    ),
    index('document_chunks_matter_id_idx').on(table.matterId),
    index('document_chunks_matter_embedding_idx').on(table.matterId, table.embeddingStatus),
    index('document_chunks_transcript_segment_idx').on(table.transcriptSegmentId),
    check(
      'document_chunks_location_check',
      sql`((${table.pageNumber} is not null)::int + (${table.transcriptSegmentId} is not null)::int) = 1`,
    ),
    check(
      'document_chunks_media_range_check',
      sql`${table.mediaStartMs} is null or ${table.mediaEndMs} is null or ${table.mediaEndMs} >= ${table.mediaStartMs}`,
    ),
  ],
);

export const subsetDocuments = pgTable(
  'subset_documents',
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
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('subset_documents_subset_document_unique').on(table.subsetId, table.documentId),
    index('subset_documents_subset_idx').on(table.subsetId),
    index('subset_documents_document_idx').on(table.documentId),
  ],
);
