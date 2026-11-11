# Backend E2E Testing Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the E2E testing foundation for the NestJS backend (`depose/packages/server`) with E2E + fixtures for the critical paths, to support production readiness.

**Architecture:** In-process NestJS app via `@nestjs/testing` on an ephemeral port (existing `health.smoke.spec.ts` pattern), real Postgres via Testcontainers, better-auth test-only instance via `testUtils`, AI via `@nestjs/ai/testing` (`FakeModel`, `overrideModels`, `callTool`, `FakeEmbeddingModel`, `overrideEmbeddingModels`), BullMQ handler-level tests.

**Tech Stack:** NestJS 12, Express 5, TypeScript, Node test runner (`node --import tsx --test`), `@nestjs/testing`, Drizzle ORM + Postgres, better-auth, `@nestjs/ai`, BullMQ.

**Spec:** `docs/superpowers/specs/2026-11-12-backend-e2e-testing-design.md`

## Global Constraints

- Test runner stays Node built-in test runner: `node --import tsx --test "test/**/*.spec.ts"`.
- E2E app pattern: `@nestjs/testing` module -> `createNestApplication` -> `setGlobalPrefix('api')` -> body parsers (raw 100mb for binary ingest / json+urlencoded 2mb) -> `listen(0, '127.0.0.1')` -> `fetch` -> `close`.
- AI E2E: register/override models with `FakeModel` / `overrideModels` from `@nestjs/ai/testing`; agent functions run for real; tool failures become tool results; embeddings via `FakeEmbeddingModel` + `overrideEmbeddingModels`.
- Auth E2E: better-auth `testUtils` on test-only auth instance; helpers `createUser/saveUser/login/getAuthHeaders`.
- Tenancy E2E: use existing tenant context / `TenantGuard` semantics.
- Ingest critical path scope: upload -> storage -> enqueue ingest job -> extraction/embedding.
- Jobs critical path: job-handler level + queue wiring; full BullMQ in-process (Redis container) deferred.

## Review Focus

- Body parser limits (raw 100mb / json 2mb) for ingest E2E.
- Auth session cookie handling in fetch-based E2E.
- `FakeModel` exhaustion behavior (no answer left).
- Tool error -> tool result conversion (`AiToolError`).
- BullMQ handler error handling.

---

### Task 1: E2E infrastructure — in-process app factory, test Postgres, auth test instance

**Files:**
- Create: `depose/packages/server/test/helpers/e2e-app.factory.ts`
- Create: `depose/packages/server/test/helpers/test-database.ts`
- Create: `depose/packages/server/test/helpers/auth.test-utils.ts`
- Create: `depose/packages/server/test/infrastructure.e2e.spec.ts`
- Modify: `depose/packages/server/package.json` (add `@testcontainers/postgres` dev dep)

**Interfaces:**
- Produces: `createE2EApp(): Promise<INestApplication>`, test DB URI provider, better-auth test helpers.

- [ ] **Step 1: Write the failing test**

```typescript
// test/infrastructure.e2e.spec.ts
// boots full AppModule via helpers, hits GET /api/health, expects 200 {status:'ok'}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter server test` (or npm equivalent in `depose/packages/server`)
Expected: FAIL (helpers/modules missing).

- [ ] **Step 3: Implement `createE2EApp`, test DB helper, auth test instance**

One line on approach: Testcontainers Postgres; better-auth test-only instance with `testUtils`.

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

### Task 2: Auth/session E2E critical path

**Files:**
- Create: `depose/packages/server/test/auth.e2e.spec.ts`

**Interfaces:**
- Consumes: helpers from Task 1.
- Produces: E2E coverage for register/login/session via better-auth testUtils.

- [ ] **Step 1: Write the failing test**

```typescript
// uses auth helpers: create user, login -> session headers, call protected route
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement minimal auth E2E support needed (test-only auth instance, session wiring)**

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

### Task 3: Tenancy/access isolation E2E critical path

**Files:**
- Create: `depose/packages/server/test/tenancy.e2e.spec.ts`

**Interfaces:**
- Consumes: helpers from Task 1; existing tenant context semantics.

- [ ] **Step 1: Write the failing test**

Cross-tenant scenario: two tenants, assert isolation.

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement minimal isolation test fixtures**

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

### Task 4: AI conversation E2E critical path

**Files:**
- Create: `depose/packages/server/test/ai.e2e.spec.ts`

**Interfaces:**
- Consumes: helpers from Task 1; `@nestjs/ai/testing` (`FakeModel`, `overrideModels`, `callTool`).

- [ ] **Step 1: Write the failing test**

POST chat endpoint with `overrideModels({ default: fake })`; agent runs real; tool call flow.

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement fake model wiring in E2E (overrideModels, tool replies, retries/timeouts)**

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

### Task 5: Document ingest E2E critical path

**Files:**
- Create: `depose/packages/server/test/ingest.e2e.spec.ts`

**Interfaces:**
- Consumes: helpers from Task 1; body parser limits from Task 1.

- [ ] **Step 1: Write the failing test**

Upload -> storage -> enqueue ingest job -> extraction/embedding fakes.

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement minimal ingest E2E (storage + job enqueue + processor fakes)**

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

### Task 6: Jobs/worker critical path (handler level) + wrap-up

**Files:**
- Create: `depose/packages/server/test/jobs.e2e.spec.ts`

**Interfaces:**
- Consumes: job handler implementations.

- [ ] **Step 1: Write the failing test**

Handler-level BullMQ job behavior (process/retry/error).

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement/fix handler as needed.**

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

---

## Final Deliverable

- E2E foundation in place; critical path specs green; documented how to extend to more modules.

---
