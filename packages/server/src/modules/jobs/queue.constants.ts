export const INGEST_QUEUE = 'document.ingest';
export const EXTRACTION_QUEUE = 'fact.extraction';

export type SupportedJobType = typeof INGEST_QUEUE | typeof EXTRACTION_QUEUE;

export const RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 600_000, 1_800_000];
