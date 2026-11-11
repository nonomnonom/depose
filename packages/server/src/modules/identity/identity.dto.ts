import { z } from 'zod';

export const firmRoleValues = ['admin', 'lawyer', 'paralegal', 'viewer', 'guest'] as const;

export const updateMemberRoleSchema = z
  .object({
    role: z.enum(firmRoleValues),
  })
  .strict();

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const createInvitationSchema = z
  .object({
    email: z.email().max(254),
    role: z.enum(firmRoleValues).default('viewer'),
  })
  .strict();

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
