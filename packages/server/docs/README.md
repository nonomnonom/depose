# Server documentation

Short, feature-focused notes on how the API actually behaves. Start with
[`../ARCHITECTURE.md`](../ARCHITECTURE.md) for the module map.

| Doc | Covers | Diagram |
| --- | --- | --- |
| [01-request-lifecycle](01-request-lifecycle.md) | Middleware, tenancy, auth, validation, errors | Sequence |
| [02-tenancy-auth](02-tenancy-auth.md) | Host tenancy, signup, SSO, roles, permissions | Flowchart |
| [03-data-model](03-data-model.md) | Firm, matter, evidence, analysis, outputs | ER |
| [04-ingestion](04-ingestion.md) | Upload, OCR, chunks, extraction, embeddings | Sequence + flowchart |
| [05-retrieval](05-retrieval.md) | Lexical vs vector search, embedding config | Flowchart + class |
| [06-intelligence](06-intelligence.md) | Grounded answers, citations, evidence score | Sequence |
| [07-analysis-features](07-analysis-features.md) | Contradictions, entities, summary, outputs | Class |
| [08-realtime](08-realtime.md) | Live sessions, transcript lines, alerts | State + sequence |
| [09-background-jobs](09-background-jobs.md) | Queues, retries, progress, idempotency | State |
| [10-deployment](10-deployment.md) | Processes, compose stack, readiness, outbound policy | Flowchart |
| [11-testing](11-testing.md) | No-container E2E, env.test, focused runs | Sequence + flowchart |

## Conventions used in these docs

- "Fact" means a confirmed or candidate assertion in the fact bank with at
  least one `fact_sources` row.
- "Evidence" means facts selected for a question.
- "Operator" means the person who controls environment variables, not a firm
  admin.
- API paths shown without a prefix are under `/api/v1`; authentication routes
  are under `/api/auth`.
