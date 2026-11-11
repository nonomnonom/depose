import { z } from 'zod';

export const createMcpServerSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    url: z.url().refine((value) => value.startsWith('http://') || value.startsWith('https://'), {
      message: 'MCP URL must use http or https',
    }),
    transport: z.enum(['http', 'sse']).default('http'),
  })
  .strict();

export type CreateMcpServerInput = z.infer<typeof createMcpServerSchema>;
