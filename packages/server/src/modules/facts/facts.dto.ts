import { z } from "zod";

export const createFactSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  entity: z.string().trim().max(500).optional(),
  action: z.string().trim().max(500).optional(),
  date: z.coerce.date().optional(),
  page: z.number().int().positive().optional(),
  sentenceIndex: z.number().int().positive().optional(),
  confidence: z.number().min(0).max(1).optional(),
  documentId: z.string().uuid().optional(),
});

export const extractFactsSchema = z.object({
  documentId: z.string().uuid().optional(),
});

export type CreateFactInput = z.infer<typeof createFactSchema>;
export type ExtractFactsInput = z.infer<typeof extractFactsSchema>;
