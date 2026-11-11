import { z } from 'zod';

export const extractFactsSchema = z
  .object({
    documentId: z.uuid().optional(),
  })
  .strict();

export type ExtractFactsInput = z.infer<typeof extractFactsSchema>;
