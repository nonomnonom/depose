import { z } from 'zod';

export const providerKindValues = [
  'openai',
  'anthropic',
  'google',
  'openrouter',
  'openai-compatible',
] as const;

export const createProviderSchema = z
  .object({
    kind: z.enum(providerKindValues),
    label: z.string().trim().min(1).max(80),
    baseUrl: z.url().optional(),
    apiKey: z.string().trim().min(1).max(500).optional(),
    models: z.array(z.string().trim().min(1).max(120)).min(1).max(50),
    fallbackModelId: z.string().trim().min(1).max(120).optional(),
  })
  .strict()
  .refine((value) => value.kind !== 'openai-compatible' || Boolean(value.baseUrl), {
    message: 'baseUrl is required for an OpenAI-compatible provider',
    path: ['baseUrl'],
  });

export type CreateProviderInput = z.infer<typeof createProviderSchema>;

export const updateProviderSchema = z
  .object({
    label: z.string().trim().min(1).max(80).optional(),
    baseUrl: z.url().optional(),
    apiKey: z.string().trim().min(1).max(500).optional(),
    models: z.array(z.string().trim().min(1).max(120)).min(1).max(50).optional(),
    fallbackModelId: z.string().trim().min(1).max(120).nullable().optional(),
  })
  .strict();

export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
