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
    OPENAPI_ENABLED: booleanFlag('true'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (see .env.example)'),
    REDIS_URL: z.string().url('REDIS_URL must be a redis:// URL'),

    /* Host-based tenancy (spec 49) */
    TENANCY_MODE: z.literal('single').default('single'),
    BASE_DOMAIN: z.string().min(1).default('localhost'),
    CUSTOM_DOMAIN_TARGET: optionalString,
    CUSTOM_DOMAIN_IP: optionalString,
    CUSTOM_DOMAIN_LIMIT: z.coerce.number().int().positive().default(5),
    TRUST_PROXY: booleanFlag('false'),
    TLS_MODE: z.enum(['files', 'cloudflare', 'external']).default('external'),
    SSL_KEY_PATH: optionalString,
    SSL_CERT_PATH: optionalString,

    /* Storage (spec 49) */
    STORAGE_TYPE: z.enum(['s3', 'local']).default('local'),
    STORAGE_LOCAL_PATH: z.string().default('.local-storage'),

    /* Auth (spec 07, 09) */
    BETTER_AUTH_URL: optionalString,
    BETTER_AUTH_SECRET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters').optional(),
    ),
    AUTH_TRUSTED_ORIGINS: z.string().default('http://localhost:5173'),
    AUTH_SSO_ENABLED: booleanFlag('false'),
    AUTH_FORCE_SSO: booleanFlag('false'),
    AUTH_ALLOW_SELF_SIGNUP: booleanFlag('true'),
    AUTH_REQUIRE_ADMIN_APPROVAL: booleanFlag('false'),
    AUTH_GOOGLE_ENABLED: booleanFlag('false'),
    AUTH_REQUIRE_EMAIL_VERIFICATION: booleanFlag('false'),

    /* Depose MCP server (optional, read-only, instance token) */
    MCP_SERVER_TOKEN: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(24, 'MCP_SERVER_TOKEN must be at least 24 characters').optional(),
    ),
    MCP_SERVER_FIRM_ID: z.uuid().optional(),

    /* Completion BYOK and gateway policy (spec 48) */
    AI_SECRET_ENCRYPTION_KEY: optionalString,
    MODEL_GATEWAY_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
    MODEL_GATEWAY_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
    MODEL_GATEWAY_STRICT_CAPABILITY: booleanFlag('true'),

    /* Fact extraction pipeline route (operator-owned, spec 16/48) */
    EXTRACTION_PROVIDER: z
      .enum(['scaledown', 'openrouter', 'openai-compatible', 'cloudflare'])
      .default('openai-compatible'),
    EXTRACTION_BASE_URL: optionalString,
    EXTRACTION_API_KEY: optionalString,
    EXTRACTION_MODEL: z.string().default('extract'),
    EXTRACTION_FALLBACK_ENABLED: booleanFlag('false'),
    EXTRACTION_PIPELINE_VERSION: z.string().default('fact-extraction-1'),
    EXTRACTION_NULL_THRESHOLD: z.coerce.number().min(0).max(1).default(0.6),

    /* Mail (spec 29) */
    MAIL_TRANSPORT: z.enum(['file', 'smtp']).default('file'),
    MAIL_FROM: z.string().default('Depose <no-reply@localhost>'),
    MAIL_DIRECTORY: z.string().default('var/mail'),
    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,

    WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),

    /* Ingest microservice transport */
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
    if (env.TLS_MODE === 'files' && (!env.SSL_KEY_PATH || !env.SSL_CERT_PATH)) {
      ctx.addIssue({
        code: 'custom',
        path: ['TLS_MODE'],
        message: 'SSL_KEY_PATH and SSL_CERT_PATH are required when TLS_MODE=files',
      });
    }
  });

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  port: number;
  openapi: {
    enabled: boolean;
  };
  databaseUrl: string;
  redisUrl: string;
  tenancy: {
    mode: 'single';
    baseDomain: string;
    customDomainTarget?: string;
    customDomainIp?: string;
    customDomainLimit: number;
    trustProxy: boolean;
  };
  tls: {
    mode: 'files' | 'cloudflare' | 'external';
    keyPath?: string;
    certPath?: string;
  };
  storage: {
    type: 's3' | 'local';
    localPath: string;
  };
  auth: {
    baseUrl: string;
    secret?: string;
    ssoEnabled: boolean;
    forceSso: boolean;
    allowSelfSignup: boolean;
    requireAdminApproval: boolean;
    googleEnabled: boolean;
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
  ai: {
    encryptionKey?: string;
    timeoutMs: number;
    maxRetries: number;
    strictCapability: boolean;
  };
  extraction: {
    provider: 'scaledown' | 'openrouter' | 'openai-compatible' | 'cloudflare';
    baseUrl?: string;
    apiKey?: string;
    model: string;
    fallbackEnabled: boolean;
    pipelineVersion: string;
    nullThreshold: number;
  };
  mcp: {
    token?: string;
    firmId?: string;
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
  const baseUrl = env.BETTER_AUTH_URL ?? `http://${env.BASE_DOMAIN}:${env.PORT}`;

  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    port: env.PORT,
    openapi: {
      enabled: env.OPENAPI_ENABLED,
    },
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    tenancy: {
      mode: env.TENANCY_MODE,
      baseDomain: env.BASE_DOMAIN.toLowerCase(),
      customDomainTarget: env.CUSTOM_DOMAIN_TARGET,
      customDomainIp: env.CUSTOM_DOMAIN_IP,
      customDomainLimit: env.CUSTOM_DOMAIN_LIMIT,
      trustProxy: env.TRUST_PROXY,
    },
    tls: {
      mode: env.TLS_MODE,
      keyPath: env.SSL_KEY_PATH,
      certPath: env.SSL_CERT_PATH,
    },
    storage: {
      type: env.STORAGE_TYPE,
      localPath: env.STORAGE_LOCAL_PATH,
    },
    auth: {
      baseUrl,
      secret: env.BETTER_AUTH_SECRET,
      ssoEnabled: env.AUTH_SSO_ENABLED,
      forceSso: env.AUTH_FORCE_SSO,
      allowSelfSignup: env.AUTH_ALLOW_SELF_SIGNUP,
      requireAdminApproval: env.AUTH_REQUIRE_ADMIN_APPROVAL,
      googleEnabled: env.AUTH_GOOGLE_ENABLED,
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
    mcp: {
      token: env.MCP_SERVER_TOKEN,
      firmId: env.MCP_SERVER_FIRM_ID,
    },
    ai: {
      encryptionKey: env.AI_SECRET_ENCRYPTION_KEY,
      timeoutMs: env.MODEL_GATEWAY_TIMEOUT_MS,
      maxRetries: env.MODEL_GATEWAY_MAX_RETRIES,
      strictCapability: env.MODEL_GATEWAY_STRICT_CAPABILITY,
    },
    extraction: {
      provider: env.EXTRACTION_PROVIDER,
      baseUrl: env.EXTRACTION_BASE_URL,
      apiKey: env.EXTRACTION_API_KEY,
      model: env.EXTRACTION_MODEL,
      fallbackEnabled: env.EXTRACTION_FALLBACK_ENABLED,
      pipelineVersion: env.EXTRACTION_PIPELINE_VERSION,
      nullThreshold: env.EXTRACTION_NULL_THRESHOLD,
    },
    worker: {
      concurrency: env.WORKER_CONCURRENCY,
    },
    ingest: {
      host: env.INGEST_HOST,
      port: env.INGEST_PORT,
    },
  };
}

export const appConfig = loadAppConfig();
