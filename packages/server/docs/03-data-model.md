# Data model

Postgres is the system of record. Drizzle schema files live in
`src/infrastructure/database/schema`. The diagram shows the tables that carry
the legal workflow; audit, usage, auth, and MCP tables are omitted for space.

```mermaid
erDiagram
  FIRMS ||--o{ FIRM_DOMAINS : "serves on"
  FIRMS ||--o{ MEMBERS : "has"
  FIRMS ||--o{ MATTERS : "owns"
  MATTERS ||--o{ MATTER_MEMBERS : "grants"
  MATTERS ||--o{ DOCUMENTS : "contains"
  DOCUMENTS ||--o{ DOCUMENT_PAGES : "has"
  DOCUMENTS ||--o{ DOCUMENT_CHUNKS : "chunked into"
  DOCUMENTS ||--o{ FACT_SOURCES : "supports"
  MATTERS ||--o{ FACTS : "fact bank"
  FACTS ||--o{ FACT_SOURCES : "cited by"
  MATTERS ||--o{ ISSUES : "frames"
  FACTS ||--o{ FACT_ISSUES : "answers"
  ISSUES ||--o{ FACT_ISSUES : "gathered by"
  MATTERS ||--o{ SUBSETS : "scopes"
  SUBSETS ||--o{ SUBSET_DOCUMENTS : "includes"
  MATTERS ||--o{ CONTRADICTIONS : "detects"
  CONTRADICTIONS ||--o{ CONTRADICTION_FACTS : "links"
  FACTS ||--o{ CONTRADICTION_FACTS : "conflicts"
  MATTERS ||--o{ ENTITIES : "resolves"
  ENTITIES ||--o{ ENTITY_ALIASES : "also known as"
  ENTITIES ||--o{ ENTITY_MENTIONS : "mentioned in"
  ENTITIES ||--o{ ENTITY_RELATIONS : "relates"
  MATTERS ||--o{ EVENTS : "chronology"
  FACTS ||--o{ EVENT_FACTS : "dates"
  MATTERS ||--o{ OUTPUTS : "drafts"
  OUTPUTS ||--o{ OUTPUT_VERSIONS : "versioned"
  OUTPUT_VERSIONS ||--o{ OUTPUT_SOURCES : "cites"
  MATTERS ||--o{ THREADS : "conversations"
  THREADS ||--o{ MESSAGES : "messages"
  MESSAGES ||--o{ MESSAGE_SOURCES : "cites"
  MATTERS ||--o{ REALTIME_SESSIONS : "live session"
  REALTIME_SESSIONS ||--o{ REALTIME_LINES : "transcript"
  REALTIME_SESSIONS ||--o{ REALTIME_ALERTS : "raises"
  REALTIME_ALERTS ||--o{ REALTIME_ALERT_FACTS : "cites"
  FIRMS ||--o{ JOBS : "background work"
```

## Invariants

- `facts` always belong to a matter and a firm. A fact without at least one
  `fact_sources` row is not usable evidence.
- `fact_sources` points at a document and page (or a transcript segment).
  Deleting a document soft-deletes it; history stays readable.
- `supports` and conflict links are many-to-many. A contradiction names both
  sides through `contradiction_facts`.
- `subsets` narrow retrieval. A subset document/fact set is applied before
  lexical or vector ranking, never after generation.
- Output versions are immutable. Sources are stored per version so an old
  draft still explains itself even after facts change. The current read API
  returns the current version and its sources.
- `messages` keep `answer`, `citations`, `evidence_score`,
  `insufficient_evidence`, and `tool_calls` so a conversation can be audited.

## Candidate versus confirmed

The fact bank distinguishes model output from lawyer-accepted truth:
`facts.status` moves through candidate, confirmed, rejected. Contradictions
have their own review state. The UI and API must not present a candidate fact
as settled, and summaries use confirmed facts only.

## Migrations

Generate with `pnpm db:generate`, apply with `pnpm db:migrate`. The production
stack runs `node dist/migrate.js` once before the API and worker start.
