import { z } from "zod";

export const firmPlanSchema = z.enum(["solo", "team", "enterprise"]);

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case");

export const createFirmSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: slugSchema.optional(),
  primaryLanguage: z.string().trim().min(2).max(20).default("id"),
  jurisdiction: z.string().trim().min(2).max(20).default("ID"),
  plan: firmPlanSchema.default("solo"),
});

export const updateFirmSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  slug: slugSchema.optional(),
  primaryLanguage: z.string().trim().min(2).max(20).optional(),
  jurisdiction: z.string().trim().min(2).max(20).optional(),
  plan: firmPlanSchema.optional(),
});

export type CreateFirmInput = z.infer<typeof createFirmSchema>;
export type UpdateFirmInput = z.infer<typeof updateFirmSchema>;
