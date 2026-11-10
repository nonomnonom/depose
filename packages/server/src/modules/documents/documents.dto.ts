import { z } from "zod";

export const documentTypeSchema = z.enum([
  "pdf",
  "docx",
  "email",
  "txt",
  "transcript",
]);

export const documentSourceSchema = z.enum([
  "upload",
  "email_import",
  "integration",
]);

export const ingestDocumentSchema = z.object({
  name: z.string().trim().min(1).max(500),
  type: documentTypeSchema,
  source: documentSourceSchema.default("upload"),
  mimeType: z.string().trim().min(1).max(200),
  content: z.string().min(1),
  language: z.string().trim().min(2).max(20).optional(),
});

export type IngestDocumentInput = z.infer<typeof ingestDocumentSchema>;
