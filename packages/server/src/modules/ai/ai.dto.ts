import { z } from 'zod';

export const createThreadSchema = z
  .object({
    title: z.string().trim().max(120).optional(),
    subsetId: z.uuid().optional(),
  })
  .strict();

export type CreateThreadInput = z.infer<typeof createThreadSchema>;

export const contextItemSchema = z
  .object({
    type: z.enum(['matter', 'document', 'fact', 'event', 'entity', 'output', 'text']),
    key: z.uuid().optional(),
    label: z.string().trim().max(120).optional(),
    value: z.string().trim().max(4_000).optional(),
  })
  .strict()
  .refine((item) => item.type === 'text' ? Boolean(item.value) : Boolean(item.key), {
    message: 'A context item needs a value for text, or a key for every other type',
  });

export const sendMessageSchema = z
  .object({
    content: z.string().trim().max(8_000).optional(),
    mode: z.enum(['ask', 'agent']).default('ask'),
    subsetId: z.uuid().optional(),
    context: z.array(contextItemSchema).max(20).optional(),
    templateId: z.uuid().optional(),
  })
  .strict()
  .refine((body) => Boolean(body.content) || (body.context?.length ?? 0) > 0, {
    message: 'Send a prompt or attach context',
  });

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
