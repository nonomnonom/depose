import { z } from 'zod';

export const matterStatusValues = ['active', 'closed', 'archived'] as const;

export const createMatterSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    matterNumber: z.string().trim().min(1).max(60).optional(),
    type: z.string().trim().min(1).max(40).default('other'),
    description: z.string().trim().max(4000).optional(),
    openedDate: z.iso.date().optional(),
    leadLawyerId: z.string().trim().min(1).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  })
  .strict();

export type CreateMatterInput = z.infer<typeof createMatterSchema>;

export const updateMatterSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    matterNumber: z.string().trim().min(1).max(60).nullable().optional(),
    type: z.string().trim().min(1).max(40).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    status: z.enum(matterStatusValues).optional(),
    leadLawyerId: z.string().trim().min(1).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  })
  .strict();

export type UpdateMatterInput = z.infer<typeof updateMatterSchema>;

export const listMattersQuerySchema = z.object({
  status: z.enum(matterStatusValues).optional(),
  q: z.string().trim().max(200).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListMattersQuery = z.infer<typeof listMattersQuerySchema>;
