import { z } from 'zod';

export const embeddingStatusValues = ['pending', 'indexed', 'failed'] as const;

export const listEmbeddingStatusQuerySchema = z.object({
  status: z.enum(embeddingStatusValues).optional(),
  cursor: z.iso.datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListEmbeddingStatusQuery = z.infer<typeof listEmbeddingStatusQuerySchema>;

export const triggerReembedSchema = z
  .object({
    chunkVersion: z.coerce.number().int().positive().optional(),
  })
  .strict();

export type TriggerReembedInput = z.infer<typeof triggerReembedSchema>;
