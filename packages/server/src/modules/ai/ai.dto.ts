import { z } from 'zod';

export const createThreadSchema = z
  .object({
    title: z.string().trim().max(120).optional(),
  })
  .strict();

export type CreateThreadInput = z.infer<typeof createThreadSchema>;

export const sendMessageSchema = z
  .object({
    content: z.string().trim().min(2).max(8000),
  })
  .strict();

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
