import { z } from 'zod';

export const documentStatusValues = [
  'queued',
  'processing',
  'done',
  'needs_review',
  'failed',
  'cancelled',
] as const;

export const listDocumentsQuerySchema = z.object({
  status: z.enum(documentStatusValues).optional(),
  q: z.string().trim().max(200).optional(),
  cursor: z.iso.datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;

export interface UploadDocumentInput {
  fileName: string;
  mimeType: string;
  data: Buffer;
}
