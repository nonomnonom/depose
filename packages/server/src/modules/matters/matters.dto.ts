import { z } from "zod";

export const matterTypeSchema = z.enum([
  "litigation",
  "corporate",
  "arbitration",
  "regulatory",
  "advisory",
  "other",
]);

export const matterStatusSchema = z.enum(["active", "closed", "archived"]);

export const createMatterSchema = z.object({
  name: z.string().trim().min(1).max(300),
  matterNumber: z.string().trim().min(1).max(100).optional(),
  type: matterTypeSchema.default("other"),
  openedDate: z.coerce.date().optional(),
  description: z.string().trim().max(5000).optional(),
  leadLawyerId: z.string().trim().min(1).max(200).optional(),
});

export const updateMatterSchema = z.object({
  name: z.string().trim().min(1).max(300).optional(),
  matterNumber: z.string().trim().min(1).max(100).nullable().optional(),
  type: matterTypeSchema.optional(),
  status: matterStatusSchema.optional(),
  openedDate: z.coerce.date().optional(),
  closedDate: z.coerce.date().nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  leadLawyerId: z.string().trim().min(1).max(200).nullable().optional(),
});

export type CreateMatterInput = z.infer<typeof createMatterSchema>;
export type UpdateMatterInput = z.infer<typeof updateMatterSchema>;
