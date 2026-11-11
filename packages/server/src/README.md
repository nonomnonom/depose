# Server module map

The backend is a **modular monolith** (spec 36). Each module owns its controllers,
services, DTOs, and persistence access. Modules talk to each other through exported
services, never by reaching into another module's files.

```text
app.module.ts                 composition root only
config/                       typed env, fail-fast validation
common/                       request context, errors, pagination, OpenAPI helpers
infrastructure/               database client/schema, storage, mail
modules/
  access-control/             the sole authorization resolver (spec 08)
  audit/                      append-only audit log
  auth/ tenancy/ identity/    session, host tenancy, members, invitations
  firms/ onboarding/          firm settings, setup, checklist
  matters/                    matter CRUD + workspace overview
  documents/                  upload, text pages, chunking, download, source viewer
  extraction/                 document.ingest + fact.extraction jobs and verification
  facts/                      fact bank, review, citations
  subsets/                    scoped workspaces and subset facts
  search/                     hybrid retrieval + Qdrant/embedding adapter
  ai/                         Dep AI agent, BYOK model gateway, decision tool
  jobs/                       BullMQ jobs, progress, retry, dead letter
  mcp/ mcp-server/            inbound MCP client registry + Depose MCP server
  notifications/              in-app notifications
```

## Dependency direction

- `common` and `infrastructure` do not import domain modules.
- `access-control` is imported by domain modules; it never imports them.
- Pipeline flow is one-way: `documents` → `extraction` → `facts` → `search`.
- `ai` depends on `search` for evidence and on the model gateway for calls.
- `extraction` depends on `documents`, `search`, and `ai` (gateway only).
- No domain service calls a provider SDK directly. Every model call goes through
  `ModelGatewayService` (spec 48).

## Queues

- `document.ingest`: text extraction, page rows, chunk rebuild, embedding index.
- `fact.extraction`: candidate extraction, quote verification (+ decision route for
  fuzzy matches), fact/source persistence, fact index.

Both are registered in `jobs/queue.constants.ts`; processors live in `extraction/`.
