import { z } from 'zod';

export const factStatusValues = [
  'proposed',
  'confirmed',
  'rejected',
  'unsupported',
  'merged',
] as const;

export const factSourceInputSchema = z
  .object({
    documentId: z.uuid(),
    quote: z.string().trim().min(1).max(4000),
    pageNumber: z.number().int().positive().optional(),
  })
  .strict();

export const createFactSchema = z
  .object({
    text: z.string().trim().min(3).max(4000),
    factType: z.string().trim().max(60).optional(),
    dateStart: z.iso.date().optional(),
    dateEnd: z.iso.date().optional(),
    source: factSourceInputSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.dateStart || !value.dateEnd || value.dateEnd >= value.dateStart,
    {
      message: 'dateEnd must be on or after dateStart',
      path: ['dateEnd'],
    },
  );

export type CreateFactInput = z.infer<typeof createFactSchema>;

export const updateFactSchema = z
  .object({
    text: z.string().trim().min(3).max(4000).optional(),
    factType: z.string().trim().max(60).nullable().optional(),
    dateStart: z.iso.date().nullable().optional(),
    dateEnd: z.iso.date().nullable().optional(),
  })
  .strict();

export type UpdateFactInput = z.infer<typeof updateFactSchema>;

export const listFactsQuerySchema = z.object({
  status: z.enum(factStatusValues).optional(),
  includeArchived: z.enum(['true', 'false']).optional().transform((value) => value === 'true'),
  q: z.string().trim().max(200).optional(),
  documentId: z.uuid().optional(),
  cursor: z.iso.datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListFactsQuery = z.infer<typeof listFactsQuerySchema>;

export const mergeFactSchema = z.object({ targetId: z.uuid() }).strict();
export const bulkFactIdsSchema = z.object({ ids: z.array(z.uuid()).min(1).max(200) }).strict();
