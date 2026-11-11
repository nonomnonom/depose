import { pgEnum } from 'drizzle-orm/pg-core';

export const matterStatusEnum = pgEnum('matter_status', ['active', 'closed', 'archived']);
export const documentProcessingStatusEnum = pgEnum('document_processing_status', [
  'queued',
  'processing',
  'done',
  'needs_review',
  'failed',
  'cancelled',
]);
export const mediaKindEnum = pgEnum('media_kind', ['audio']);
export const mediaAssetStatusEnum = pgEnum('media_asset_status', [
  'uploaded',
  'transcribing',
  'transcribed',
  'failed',
]);
export const transcriptSegmentStatusEnum = pgEnum('transcript_segment_status', ['draft', 'final']);
export const embeddingStatusEnum = pgEnum('embedding_status', ['pending', 'indexed', 'failed']);
export const factStatusEnum = pgEnum('fact_status', [
  'proposed',
  'confirmed',
  'rejected',
  'unsupported',
  'merged',
]);
export const factOriginEnum = pgEnum('fact_origin', ['extracted', 'manual', 'imported']);
export const relevanceLabelEnum = pgEnum('relevance_label', [
  'key',
  'relevant',
  'disputed',
  'maybe_relevant',
  'not_relevant',
  'unclassified',
]);
export const relevanceScopeEnum = pgEnum('relevance_scope', ['matter', 'subset']);
export const issueStatusEnum = pgEnum('issue_status', ['open', 'closed']);
export const themeStatusEnum = pgEnum('theme_status', ['draft', 'confirmed']);
export const summaryStatusEnum = pgEnum('summary_status', ['draft', 'confirmed', 'stale']);
export const entityStatusEnum = pgEnum('entity_status', ['proposed', 'confirmed', 'rejected']);
export const entityRelationStatusEnum = pgEnum('entity_relation_status', [
  'proposed',
  'confirmed',
  'rejected',
]);
export const eventStatusEnum = pgEnum('event_status', ['proposed', 'confirmed', 'rejected']);
export const contradictionStatusEnum = pgEnum('contradiction_status', [
  'candidate',
  'open',
  'confirmed',
  'dismissed',
  'stale',
]);
export const gapStatusEnum = pgEnum('gap_status', ['open', 'confirmed', 'dismissed']);
export const outputStatusEnum = pgEnum('output_status', ['draft', 'final']);
export const jobStatusEnum = pgEnum('job_status', [
  'queued',
  'running',
  'succeeded',
  'failed',
  'dead',
  'cancelled',
]);
export const workflowRunStatusEnum = pgEnum('workflow_run_status', [
  'queued',
  'running',
  'succeeded',
  'partial',
  'failed',
  'cancelled',
]);
export const modelCapabilityEnum = pgEnum('model_capability', [
  'completion',
  'decision',
  'extraction',
  'ocr',
  'transcription',
]);
export const modelCallStatusEnum = pgEnum('model_call_status', ['succeeded', 'failed']);
export const notificationDeliveryStatusEnum = pgEnum('notification_delivery_status', [
  'queued',
  'sent',
  'delivered',
  'failed',
  'skipped',
  'bounced',
]);
export const webhookDeliveryStatusEnum = pgEnum('webhook_delivery_status', [
  'pending',
  'delivering',
  'delivered',
  'failed',
  'dead',
]);
export const mcpConnectionStatusEnum = pgEnum('mcp_connection_status', [
  'disconnected',
  'connecting',
  'connected',
  'error',
  'revoked',
]);
export const matterAccessEnum = pgEnum('matter_access', [
  'full',
  'contributor',
  'viewer',
  'guest',
]);
export const firmRoleEnum = pgEnum('firm_role', [
  'admin',
  'lawyer',
  'paralegal',
  'viewer',
  'guest',
]);
export const domainTypeEnum = pgEnum('domain_type', ['subdomain', 'custom']);
export const domainStatusEnum = pgEnum('domain_status', [
  'pending',
  'verifying',
  'active',
  'failed',
  'disabled',
]);
export const domainSslStatusEnum = pgEnum('domain_ssl_status', [
  'pending',
  'issued',
  'expired',
  'failed',
  'external',
]);
export type FirmRole = (typeof firmRoleEnum.enumValues)[number];
export type MatterAccess = (typeof matterAccessEnum.enumValues)[number];
