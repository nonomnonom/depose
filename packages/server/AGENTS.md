# Agent guide: server

Read `ARCHITECTURE.md` and the relevant file in `docs/` before changing a flow.

## Commands

Run from `packages/server`:

| Task | Command |
| --- | --- |
| Typecheck | `pnpm check-types` |
| Lint (writes fixes) | `pnpm lint` |
| Build | `pnpm build` |
| Full E2E | `pnpm test` |
| One E2E file | `pnpm test test/inconsistencies.e2e.spec.ts` |
| OpenAPI + client input | `node scripts/export-openapi.mjs` |
| Migrations | `pnpm db:generate`, `pnpm db:migrate` |

Tests reuse the development Postgres and Redis. Do not add Testcontainers or
other per-spec container startup; each spec already gets its own throwaway
database and Redis logical database. See `docs/11-testing.md`.

## Code map

- `src/config/app.config.ts` - the only place environment variables are read
  and validated. Add a schema field and a typed getter together.
- `src/app.bootstrap.ts` - middleware order shared by production and E2E.
- `src/common` - guards, pipes, filters, request context, rate limiting,
  outbound URL policy.
- `src/modules/<feature>` - one feature per folder, Nest module at the root.
- `src/infrastructure` - database client/schema, storage, mail, Redis.
- `test/` - Node test runner E2E specs and helpers.

## Rules

1. **Firm scope first.** Every query starts from the firm or a matter that was
   checked against the firm. Never trust a client-supplied firm id.
2. **Facts carry provenance.** Store `fact_sources` for every extracted fact.
   Any AI output that mentions evidence returns fact ids or source ids.
3. **No invented evidence.** When retrieval is empty, return the
   `insufficientEvidence` path instead of letting the model answer freely.
4. **Human review stays explicit.** Confirmed facts, accepted contradictions,
   and output versions are separate states. Do not silently promote model
   output to truth.
5. **Operator config is server-side.** No provider keys in the browser and no
   per-firm BYOK endpoints. Add new routes to the operator config, not to firm
   settings, unless the reference says otherwise.
6. **Input is Zod.** Controllers use `ZodBodyPipe` and a DTO in `*.dto.ts`.
   Response shapes are classes in `*.response.ts` with `@ApiProperty`.
7. **Errors are domain errors.** Throw `DomainError`; the global filter
   produces the envelope. Do not return ad-hoc error shapes.
8. **Background work is idempotent.** Jobs can retry five times. Check the
   current row state before writing, and make status transitions monotonic.
9. **Respect the outbound URL policy.** Any admin-supplied URL goes through
   `common/outbound-url.ts` before a request is made.
10. **Update the docs.** A behaviour change updates the matching `docs/*.md`
    diagram or text in the same change.

## Adding a feature

1. Add or extend the Drizzle schema and generate a migration.
2. Create the module/controller/service/DTO/response files.
3. Register the module in `app.module.ts`; export services other modules use.
4. Add permissions in `access-control` if the route is not covered.
5. Add the route to OpenAPI tests or the smoke routes list when applicable.
6. Run `pnpm check-types`; regenerate OpenAPI if the HTTP surface changed.
7. Add a focused E2E test only for behaviour that needs a database.

## Testing style

- One `describe` per behaviour, arrange through the real HTTP handlers.
- Use `createE2EApp()` and `e2eHelpers()`; never construct services directly
  when the route is the behaviour under test.
- Close the app in `after()` so the database is dropped.
- Keep tests independent: a spec may run beside another spec file.
