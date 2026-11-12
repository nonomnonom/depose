# Depose

Self-hosted, open-source legal intelligence workspace: a Wexler-style backend for
ingesting matters and documents, extracting facts and chronology, finding
inconsistencies, and answering questions with citations.

The repository is a pnpm + Turborepo monorepo.

- `packages/server` - NestJS API, BullMQ workers, Postgres (Drizzle), Redis
- `packages/frontend` - React/Vite workspace UI
- `packages/docker` - Dockerfiles, compose stacks, self-host operations
- `packages/ui`, `packages/dev-utils` - shared UI and tooling

## Requirements

- Node.js 24+
- pnpm 11+
- Docker (Postgres and Redis for local development)

## Local development

```sh
pnpm install

# Postgres + Redis only
pnpm --filter @depose/docker dev:infra

cd packages/server
cp .env.example .env      # fill BETTER_AUTH_SECRET and AI_SECRET_ENCRYPTION_KEY
pnpm setup                # apply migrations / seed as needed
pnpm dev                  # http://localhost:3000

cd ../frontend
pnpm dev
```

The API serves OpenAPI at `GET /api/v1/openapi.json` and Swagger UI at `/api/docs`
when `OPENAPI_ENABLED=true`.

## Self-hosting

See [`packages/docker/README.md`](packages/docker/README.md). The production
compose stack runs migrations once, then starts the API (`server`), job
consumers (`worker`), and the frontend.

Operational behaviour worth knowing:

- `GET /api/health` is liveness; `GET /api/health/ready` returns 503 when
  Postgres or Redis is down.
- Uploaded files are stored on the local filesystem (`STORAGE_TYPE=local`,
  shared `storage-data` volume). Object storage is not implemented; other
  storage types are rejected at startup.
- API replicas run with `WORKER_ENABLED=false`; background jobs are consumed by
  the `worker` process (`node dist/worker.main.js`).
- Outbound AI providers, MCP servers, and webhooks are validated against SSRF.
  `ALLOW_PRIVATE_OUTBOUND_URLS=auto` blocks private/loopback targets in
  production and allows them in development for local model servers.

## Security model

- Firm-scoped tenancy resolved from the request host; every matter route
  authorises the caller against the firm and the matter.
- Firm API keys use the `dp_...` format, are stored as SHA-256 digests, accept
  `Authorization: Bearer`, and are constrained by scopes (`matter.read`,
  `matter.update`, admin scopes for key management). Keys are read-only unless
  scopes are granted explicitly, and `lastUsedAt` is tracked.
- Webhook signing secrets are encrypted at rest with AES-256-GCM; webhook
  deliveries are HMAC-signed. AI provider credentials are operator-owned
  environment configuration, not per-firm stored keys.
- Global and auth-specific rate limits, security headers, request ids, and a
  1 MB JSON body limit (100 MB only for document upload) are enabled by default.

## Checks

```sh
cd packages/server
pnpm check-types
pnpm lint
pnpm test          # critical Jest E2E on local Postgres/Redis (no containers)
```
