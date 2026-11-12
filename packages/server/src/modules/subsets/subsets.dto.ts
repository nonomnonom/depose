import { z } from 'zod';

const uuidList = z.array(z.uuid()).max(500);

export const createSubsetSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2_000).optional(),
    applyMatterIssues: z.boolean().default(true),
    documentIds: uuidList.min(1),
    issueIds: uuidList.optional(),
  })
  .strict();

export type CreateSubsetInput = z.infer<typeof createSubsetSchema>;

export const updateSubsetSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2_000).nullable().optional(),
    applyMatterIssues: z.boolean().optional(),
    issueIds: uuidList.optional(),
  })
  .strict();

export type UpdateSubsetInput = z.infer<typeof updateSubsetSchema>;

export const setSubsetDocumentsSchema = z
  .object({
    documentIds: uuidList.min(1),
  })
  .strict();

export type SetSubsetDocumentsInput = z.infer<typeof setSubsetDocumentsSchema>;

export const subsetFromSourcesSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    applyMatterIssues: z.boolean().default(true),
    factIds: uuidList.optional(),
    documentIds: uuidList.optional(),
  })
  .strict()
  .refine(
    (body) => (body.factIds?.length ?? 0) + (body.documentIds?.length ?? 0) > 0,
    { message: 'Choose at least one source' },
  );

export type SubsetFromSourcesInput = z.infer<typeof subsetFromSourcesSchema>;

export const subsetFactsQuerySchema = z.object({
  includeManual: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.iso.datetime({ offset: true }).optional(),
});

export type SubsetFactsQuery = z.infer<typeof subsetFactsQuerySchema>;
