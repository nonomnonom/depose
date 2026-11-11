# Design: Backend E2E Testing Foundation & Critical Path Coverage

- **Date:** 2026-11-12
- **Topic:** backend-e2e-testing
- **Status:** Approved in direction - pending final sign-off before implementation

## Intent and Why

Kita sedang membangun *self-hosted alternative* dari Wexler AI. Sasaran
backend harus **production ready**, dan user memutuskan bahwa strategy yang
sesuai bukan "ujian semua modul", melainkan membangun fondasi *testing*:
**E2E tests + fixtures untuk critical paths**, sebelum menambah coverage
luar biasa.

## Goals

1. Menyediakan infrastruktur E2E test untuk `packages/server` (NestJS backend).
2. Menyediakan fixtures/factories untuk critical paths.
3. Coverage critical paths end-to-end:
   - auth/session lifecycle,
   - tenancy & access isolation,
   - document ingest pipeline,
   - AI conversation flow,
   - jobs/worker processing.
4. Fondasi yang extensible ke modul backend lain di kemudian hari.

## Non-Goals / Anti-Goals

- Uji seluruh modul backend secara eksplisit (user decision: *tidak semuanya
  harus diuji*).
- E2E test untuk frontend pada tahap ini.
- Load / chaos / resilience testing (di luar scope fondasi).

## Constraints

- Runtime: NestJS 12 + Express 5, `@nestjs/testing` (`Test.createTestingModule`).
- Test runner: Node built-in test runner via `node --import tsx --test
  "test/**/*.spec.ts"` (sudah ada di `packages/server/package.json` -> `test`,
  `test:watch`, `test:ci`).
- Pola test yang sudah ada: `test/health.smoke.spec.ts` - in-process app via
  `@nestjs/testing`, `app.setGlobalPrefix('api')`, `app.listen(0, '127.0.0.1')`,
  `fetch`, `app.close()`.
- Stack infrastruktur: Drizzle ORM + Postgres, Redis, Qdrant; docker-compose di
  `packages/docker` (db, redis, qdrant, server, worker, frontend).
- Auth: better-auth; AI: AI SDK (OpenAI-compatible / Anthropic / Google);
  jobs: BullMQ + worker.

## Approaches Considered

1. **In-process app + real dependencies via containers** (Testcontainers untuk
   Postgres/Redis/Qdrant) + fixtures via factories + critical paths. (Picked)
2. Supertest-style dengan persistence dimock - cepat tapi minim nilai integrasi.
3. Spawn server process + HTTP sungguhan - lambat & brittle.

## Decisions

- Runner & gaya: pertahankan Node test runner + `@nestjs/testing`; ikuti pola
  ephemeral-port `fetch` dari `health.smoke.spec.ts`.
- Bootstrap app: konfigurasi minimal meniru produksi (global prefix `api`).
- Database: Testcontainers Postgres (+ Redis/Qdrant bila module butuh), reset
  state di antara test.

### Finalized decisions (2026-11-12)

- **AI critical path (E2E):** pakai `@nestjs/ai/testing` - `FakeModel` /
  `overrideModels()` pada full `AppModule`; agent functions berjalan untuk real
  dengan schema/tools/guard/filters; tool failure dibaca sebagai tool result di
  pemanggilan berikutnya. Retries/timeout/fallback via konfigurasi module.
  Embedding: `FakeEmbeddingModel` + `overrideEmbeddingModels()`.
- **Auth (E2E):** pakai better-auth `testUtils` plugin pada *test-only* auth
  instance; helpers `createUser/saveUser/login/getAuthHeaders`; tidak memengaruhi
  auth produksi.
- **Tenancy:** E2E isolation via konteks tenancy existing (`TenantGuard` /
  tenant context); fixture multi-tenant.
- **Bootstrap E2E app:** replicate konfigurasi produksi minimal yang diperlukan
  untuk critical path yang diuji (global prefix `api`, body parsers: raw 100mb untuk
  binary ingest / json+urlencoded 2mb, dst).
- **Ingest scope:** upload -> storage -> enqueue ingest job -> extraction/embedding.
- **Jobs/worker:** uji di job-handler level + wiring queue; full BullMQ in-process
  via Redis container ditunda ke fase berikutnya.

## Critical Path yang Ditentukan

1. Auth/session lifecycle (better-auth testUtils + authed requests).
2. Tenancy & access isolation (cross-tenant scenario).
3. Document ingest (upload -> storage -> ingest job -> extraction/embedding).
4. AI conversation (FakeModel + overrideModels + tool calls).
5. Jobs/worker (handler level).

## What's Left to the Builder

- Menambah dependensi/infra test (Testcontainers atau setup serupa).
- Menulis fixtures/factories.
- Menulis E2E spec untuk critical paths yang dipilih.
- Wiring script `test:ci`.

## Open Questions

- Resolved via delegation (agent memutuskan terbaik): AI boundary, auth strategy,
  tenancy model, bootstrap replication, ingest scope, jobs strategy.
