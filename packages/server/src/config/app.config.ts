import 'dotenv/config';
import { z } from 'zod';

const booleanFlag = (defaultValue: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(defaultValue)
    .transform((value) => value === 'true');

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional(),
);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (see .env.example)'),

    BETTER_AUTH_URL: optionalString,
    BETTER_AUTH_SECRET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters').optional(),
    ),
    AUTH_TRUSTED_ORIGINS: z.string().default('http://localhost:3000'),
    AUTH_SSO_ENABLED: booleanFlag('false'),
    AUTH_FORCE_SSO: booleanFlag('false'),
    AUTH_ALLOW_SELF_SIGNUP: booleanFlag('true'),
    AUTH_REQUIRE_EMAIL_VERIFICATION: booleanFlag('false'),

    MAIL_TRANSPORT: z.enum(['file', 'smtp']).default('file'),
    MAIL_FROM: z.string().default('Depose <no-reply@localhost>'),
    MAIL_DIRECTORY: z.string().default('var/mail'),
    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,

    WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),

    MASTRA_PREFIX: z
      .string()
      .regex(/^\/[a-zA-Z0-9/_-]*$/, 'MASTRA_PREFIX must start with /')
      .default('/api/mastra'),
    MASTRA_MODEL: z.string().default('openai/gpt-4.1-mini'),
    OPENAI_API_KEY: optionalString,

    VECTOR_SEARCH_ENABLED: booleanFlag('false'),
    EMBEDDING_MODEL: z.string().default('openai/text-embedding-3-small'),
    EMBEDDING_DIMENSION: z.coerce.number().int().positive().default(1536),
    MEMORY_ENABLED: booleanFlag('true'),
    MEMORY_LAST_MESSAGES: z.coerce.number().int().positive().default(12),

    INGEST_HOST: z.string().default('127.0.0.1'),
    INGEST_PORT: z.coerce.number().int().positive().default(4000),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.BETTER_AUTH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['BETTER_AUTH_SECRET'],
        message: 'BETTER_AUTH_SECRET is required in production',
      });
    }
    if (env.AUTH_FORCE_SSO && !env.AUTH_SSO_ENABLED) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_FORCE_SSO'],
        message: 'AUTH_FORCE_SSO requires AUTH_SSO_ENABLED=true',
      });
    }
    if (env.MAIL_TRANSPORT === 'smtp' && !env.SMTP_HOST) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message: 'SMTP_HOST is required when MAIL_TRANSPORT=smtp',
      });
    }
    if (env.AUTH_REQUIRE_EMAIL_VERIFICATION && env.MAIL_TRANSPORT !== 'smtp') {
      ctx.addIssue({
        code: 'custom',
        path: ['MAIL_TRANSPORT'],
        message: 'MAIL_TRANSPORT=smtp is required when AUTH_REQUIRE_EMAIL_VERIFICATION=true',
      });
    }
    if (env.VECTOR_SEARCH_ENABLED && !env.OPENAI_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['OPENAI_API_KEY'],
        message: 'OPENAI_API_KEY is required when VECTOR_SEARCH_ENABLED=true (used for embeddings)',
      });
    }
  });

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  port: number;
  databaseUrl: string;
  auth: {
    baseUrl?: string;
    secret?: string;
    ssoEnabled: boolean;
    forceSso: boolean;
    allowSelfSignup: boolean;
    requireEmailVerification: boolean;
    trustedOrigins: string[];
  };
  smtp?: {
    host: string;
    port: number;
    user?: string;
    pass?: string;
  };
  mail: {
    transport: 'file' | 'smtp';
    from: string;
    directory: string;
  };
  worker: {
    concurrency: number;
  };
  mastra: {
    prefix: string;
    model: string;
    openAiApiKey?: string;
  };
  rag: {
    enabled: boolean;
    embeddingModel: string;
    embeddingDimension: number;
  };
  memory: {
    enabled: boolean;
    lastMessages: number;
  };
  ingest: {
    host: string;
    port: number;
  };
}

export function loadAppConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid server configuration:\n${details}`);
  }

  const env = parsed.data;
  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    auth: {
      baseUrl: env.BETTER_AUTH_URL,
      secret: env.BETTER_AUTH_SECRET,
      ssoEnabled: env.AUTH_SSO_ENABLED,
      forceSso: env.AUTH_FORCE_SSO,
      allowSelfSignup: env.AUTH_ALLOW_SELF_SIGNUP,
      requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION,
      trustedOrigins: env.AUTH_TRUSTED_ORIGINS.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    },
    ...(env.SMTP_HOST
      ? {
          smtp: {
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        }
      : {}),
    mail: {
      transport: env.MAIL_TRANSPORT,
      from: env.MAIL_FROM,
      directory: env.MAIL_DIRECTORY,
    },
    worker: {
      concurrency: env.WORKER_CONCURRENCY,
    },
    mastra: {
      prefix: env.MASTRA_PREFIX,
      model: env.MASTRA_MODEL,
      openAiApiKey: env.OPENAI_API_KEY,
    },
    rag: {
      enabled: env.VECTOR_SEARCH_ENABLED,
      embeddingModel: env.EMBEDDING_MODEL,
      embeddingDimension: env.EMBEDDING_DIMENSION,
    },
    memory: {
      enabled: env.MEMORY_ENABLED,
      lastMessages: env.MEMORY_LAST_MESSAGES,
    },
    ingest: {
      host: env.INGEST_HOST,
      port: env.INGEST_PORT,
    },
  };
}

export const appConfig = loadAppConfig();
