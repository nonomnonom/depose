# Depose server

NestJS API and BullMQ workers for Depose. It owns authentication, firm
tenancy, document ingestion, the fact bank, retrieval, contradiction and entity
analysis, outputs, live transcript checking, and the read-only MCP surface.

Postgres (Drizzle), Redis (BullMQ), local file storage, and operator-owned AI
routes are the only infrastructure dependencies.

## Run locally

```sh
# from the repository root
pnpm install
pnpm --filter @depose/docker dev:infra   # Postgres + Redis + Qdrant

cd packages/server
cp .env.example .env                     # set DATABASE_URL, REDIS_URL, secrets
pnpm setup                               # migrations and first-run data
pnpm dev                                 # http://localhost:3000
```

`GET /api/health` is liveness. `GET /api/health/ready` returns 503 when
Postgres or Redis is unavailable. OpenAPI is served at `/api/v1/openapi.json`
and Swagger UI at `/api/docs` when `OPENAPI_ENABLED=true` outside production.

The worker is a separate process when `WORKER_ENABLED=false` on API replicas:

```sh
pnpm build
node dist/worker.main.js
```

## Environment

All configuration is validated once at import time in
`src/config/app.config.ts`. An invalid environment stops the process with a
field-by-field error rather than failing later on a request.

| Group | Variables | Notes |
| --- | --- | --- |
| Core | `DATABASE_URL`, `REDIS_URL`, `PORT`, `OPENAPI_ENABLED` | Required database and Redis URLs. |
| Tenancy | `TENANCY_MODE`, `BASE_DOMAIN`, `TRUST_PROXY`, `TLS_MODE` | Host-based tenancy; keep `TRUST_PROXY=true` behind a proxy. |
| Auth | `BETTER_AUTH_SECRET`, `AUTH_SSO_ENABLED`, `AUTH_FORCE_SSO`, `AUTH_ALLOW_SELF_SIGNUP`, `AUTH_REQUIRE_EMAIL_VERIFICATION` | `AUTH_FORCE_SSO=true` requires `AUTH_SSO_ENABLED=true` to be usable. |
| AI | `AI_PROVIDER`, `AI_BASE_URL`, `AI_MODEL`, `AI_FAST_MODEL`, `AI_BALANCED_MODEL`, `AI_THOROUGH_MODEL` | Instance-owned; there is no per-firm key storage. |
| Extraction | `EXTRACTION_PROVIDER`, `EXTRACTION_BASE_URL`, `EXTRACTION_MODEL` | Fixed by the operator so firms cannot change how facts are produced. |
| Decisions | `DECISION_PROVIDER`, `DECISION_BASE_URL`, `DECISION_MODEL` | Typed contradiction decisions; defaults to TypeSafe `jev-latest`. |
| Embeddings | `EMBEDDING_ENABLED`, `EMBEDDING_BASE_URL`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSION` | See below. |
| Vector store | `VECTOR_SEARCH_ENABLED`, `QDRANT_URL`, `QDRANT_COLLECTION_PREFIX` | Qdrant stores and searches vectors; it does not create them. |
| OCR | `OCR_PROVIDER`, `OCR_BASE_URL`, `OCR_MODEL` | `offline` uses the local text extractor. |
| Storage | `STORAGE_TYPE`, `STORAGE_LOCAL_PATH` | Local filesystem only. |
| MCP | `MCP_SERVER_TOKEN`, `MCP_SERVER_FIRM_ID` | Optional read-only MCP endpoint. |
| Outbound | `ALLOW_PRIVATE_OUTBOUND_URLS` | `auto` blocks private targets in production. |

### Embeddings versus vectors

Embedding and vector search are related but not the same switch:

- `EMBEDDING_ENABLED=true` and `EMBEDDING_BASE_URL` set: text is sent to an
  OpenAI-compatible `/embeddings` route, the returned vectors are stored in
  Qdrant, and queries use a vector search.
- `EMBEDDING_ENABLED=false` or no embedding route: no embedding model is
  called, Qdrant is not queried, and retrieval uses lexical search over facts
  and document chunks. Qdrant cannot search text without an encoder, so a
  "Qdrant only, no embedding model" retrieval mode is not a working mode in
  this codebase.
- `VECTOR_SEARCH_ENABLED=false` disables the vector path entirely. It is the
  right setting for air-gapped deployments that only want lexical retrieval.

The effective vector path requires all three: `VECTOR_SEARCH_ENABLED`,
`EMBEDDING_ENABLED`, and a configured embedding base URL. `QDRANT_URL` is only
used when that path is active.

## Checks

```sh
pnpm check-types
pnpm test                                  # full E2E suite
pnpm test test/inconsistencies.e2e.spec.ts  # one spec file
```

Tests do not start containers. They use the local Postgres and Redis from
`packages/docker/docker-compose.yml`: each spec file gets a throwaway database
and its own Redis logical database. Copy `.env.test.example` to `.env.test`
when the defaults do not match your machine. See
[`docs/11-testing.md`](docs/11-testing.md).

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) - module map and runtime shape
- [`docs/README.md`](docs/README.md) - per-feature flows with Mermaid diagrams
- [`AGENTS.md`](AGENTS.md) - conventions for coding agents working in this package
