export const OCR_QUEUE = 'document.ocr';

export type SupportedOcrProvider = 'azure-read' | 'google-document-ai' | 'openrouter-clairic' | 'offline';

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  confidence: number | null;
  blockCount: number;
  source: 'text-layer' | 'ocr';
  provider: string;
  model: string;
  latencyMs: number;
  errorCode?: string;
}
