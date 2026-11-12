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

    /*
     * Outbound URL policy. Provider and webhook endpoints are supplied by firm
     * admins, so a compromised admin account must not be able to reach the
     * metadata service or internal networks. `auto` blocks private targets in
     * production and allows them in development/test (self-hosted local models).
     */
    ALLOW_PRIVATE_OUTBOUND_URLS: z.enum(['true', 'false', 'auto']).default('auto'),

    /* Background workers. Turn off in API replicas when a worker runs separately. */
    WORKER_ENABLED: booleanFlag('true'),

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

    /*
     * Instance AI provider. Operator-owned, like the decision and extraction
     * routes: there is no per-firm BYOK. The provider package is selected by
     * AI_PROVIDER, and AiModule registers the aliases fast/balanced/thorough.
     */
    AI_PROVIDER: z
      .enum(['openai', 'openai-compatible', 'anthropic', 'google', 'openrouter'])
      .default('openai-compatible'),
    AI_BASE_URL: optionalString,
    AI_API_KEY: optionalString,
    AI_MODEL: z.string().default(''),
    AI_FAST_MODEL: optionalString,
    AI_BALANCED_MODEL: optionalString,
    AI_THOROUGH_MODEL: optionalString,
    AI_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
    AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),

    /* Webhook signing secrets are encrypted at rest with this key. */
    WEBHOOK_ENCRYPTION_KEY: optionalString,

    /* Decision route (System One, operator-owned, spec 48) */
    DECISION_PROVIDER: z
      .enum(['typesafe', 'openrouter', 'openai-compatible'])
      .default('typesafe'),
    DECISION_BASE_URL: optionalString,
    DECISION_API_KEY: optionalString,
    DECISION_MODEL: z.string().default('jev-latest'),
    DECISION_THRESHOLD: z.coerce.number().min(0).max(1).default(0.8),

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

    /* Retrieval, embeddings, Qdrant (spec 22) */
    VECTOR_SEARCH_ENABLED: booleanFlag('true'),
    QDRANT_URL: optionalString,
    QDRANT_API_KEY: optionalString,
    QDRANT_COLLECTION_PREFIX: z.string().regex(/^[a-z0-9_]+$/).default('depose'),
    /* An embedding model turns text into the vectors Qdrant stores and searches.
     * When off, Qdrant is not queried and retrieval falls back to lexical search. */
    EMBEDDING_ENABLED: booleanFlag('true'),
    EMBEDDING_BASE_URL: optionalString,
    EMBEDDING_API_KEY: optionalString,
    EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
    EMBEDDING_DIMENSION: z.coerce.number().int().positive().default(1536),

    /* OCR — page-level text extraction from scanned / image / TIF / handwritten pages. */
    OCR_PROVIDER: z
      .enum(['azure-read', 'google-document-ai', 'openrouter-clairic', 'offline'])
      .default('offline'),
    OCR_BASE_URL: optionalString,
    OCR_API_KEY: optionalString,
    OCR_MODEL: z.string().default('read-3'),
    OCR_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000),
    OCR_MIN_TEXT_CHARS: z.coerce.number().int().positive().default(40),

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
    if (env.STORAGE_TYPE === 's3') {
      ctx.addIssue({
        code: 'custom',
        path: ['STORAGE_TYPE'],
        message:
          'STORAGE_TYPE=s3 is not implemented in this build. Use local storage on a persistent volume.',
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
    type: 'local';
    localPath: string;
  };
  outbound: {
    allowPrivateUrls: boolean;
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
    enabled: boolean;
  };
  ai: {
    provider: 'openai' | 'openai-compatible' | 'anthropic' | 'google' | 'openrouter';
    baseUrl?: string;
    apiKey?: string;
    model: string;
    fastModel?: string;
    balancedModel?: string;
    thoroughModel?: string;
    timeoutMs: number;
    maxRetries: number;
  };
  webhooks: {
    encryptionKey?: string;
  };
  retrieval: {
    vectorEnabled: boolean;
    qdrantUrl?: string;
    qdrantApiKey?: string;
    collectionPrefix: string;
    embeddingEnabled: boolean;
    embeddingBaseUrl?: string;
    embeddingApiKey?: string;
    embeddingModel: string;
    embeddingDimension: number;
  };
  decision: {
    provider: 'typesafe' | 'openrouter' | 'openai-compatible';
    baseUrl?: string;
    apiKey?: string;
    model: string;
    threshold: number;
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
  ocr: {
    provider: 'azure-read' | 'google-document-ai' | 'openrouter-clairic' | 'offline';
    baseUrl?: string;
    apiKey?: string;
    model: string;
    timeoutMs: number;
    minTextChars: number;
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
  const allowPrivateUrls =
    env.ALLOW_PRIVATE_OUTBOUND_URLS === 'auto'
      ? env.NODE_ENV !== 'production'
      : env.ALLOW_PRIVATE_OUTBOUND_URLS === 'true';

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
      type: 'local',
      localPath: env.STORAGE_LOCAL_PATH,
    },
    outbound: {
      allowPrivateUrls,
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
      provider: env.AI_PROVIDER,
      baseUrl: env.AI_BASE_URL,
      apiKey: env.AI_API_KEY,
      model: env.AI_MODEL,
      fastModel: env.AI_FAST_MODEL,
      balancedModel: env.AI_BALANCED_MODEL,
      thoroughModel: env.AI_THOROUGH_MODEL,
      timeoutMs: env.AI_TIMEOUT_MS,
      maxRetries: env.AI_MAX_RETRIES,
    },
    webhooks: {
      encryptionKey: env.WEBHOOK_ENCRYPTION_KEY,
    },
    retrieval: {
      vectorEnabled: env.VECTOR_SEARCH_ENABLED,
      qdrantUrl: env.QDRANT_URL,
      qdrantApiKey: env.QDRANT_API_KEY,
      collectionPrefix: env.QDRANT_COLLECTION_PREFIX,
      embeddingEnabled: env.EMBEDDING_ENABLED,
      embeddingBaseUrl: env.EMBEDDING_BASE_URL,
      embeddingApiKey: env.EMBEDDING_API_KEY,
      embeddingModel: env.EMBEDDING_MODEL,
      embeddingDimension: env.EMBEDDING_DIMENSION,
    },
    ocr: {
      provider: env.OCR_PROVIDER,
      baseUrl: env.OCR_BASE_URL,
      apiKey: env.OCR_API_KEY,
      model: env.OCR_MODEL,
      timeoutMs: env.OCR_TIMEOUT_MS,
      minTextChars: env.OCR_MIN_TEXT_CHARS,
    },
    decision: {
      provider: env.DECISION_PROVIDER,
      baseUrl: env.DECISION_BASE_URL,
      apiKey: env.DECISION_API_KEY,
      model: env.DECISION_MODEL,
      threshold: env.DECISION_THRESHOLD,
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
      enabled: env.WORKER_ENABLED,
    },
    ingest: {
      host: env.INGEST_HOST,
      port: env.INGEST_PORT,
    },
  };
}

export const appConfig = loadAppConfig();
