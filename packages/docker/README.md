# @depose/docker

Container tooling for Depose.

## Structure

- `docker-compose.dev.yml` - infrastructure only: PostgreSQL + Redis. Use this when developing locally against source code.
- `docker-compose.yml` - full stack: server + worker + frontend + db + redis. Used for self-hosted / deploy.
- `docker-compose.override.yml` - dev overrides for the full stack compose (mounted source in dev containers).
- `.env.example` - environment variables reference.
- `Dockerfile.server` - server build image with dev target.
- `Dockerfile.frontend` - frontend build image with dev target.

## Quick start

### Infrastructure only (recommended for local development)

```sh
cd packages/docker

# start db + redis
pnpm dev:infra

# stop
pnpm dev:infra:down

# wipe data + stop
pnpm dev:down
```

Then run the apps locally:

```sh
pnpm --filter server dev
pnpm --filter @depose/frontend dev
```

### Full stack (dev containers)

```sh
cd packages/docker

# build + start everything in dev mode
pnpm dev

# stop without removing
pnpm dev:stop

# stop and remove
pnpm down
```

### Full stack (production / self-host)

```sh
cd packages/docker

# create .env from example
cp .env.example .env

# edit .env with real values

# build images
pnpm build

# start
pnpm up

# or separate production compose without dev overrides
pnpm up:prod

# logs
pnpm logs
pnpm logs:server
pnpm logs:worker

# stop
pnpm down
pnpm down:prod
```

## Services

- `db` - PostgreSQL
- `redis` - Redis
- `qdrant` - vector index (optional at runtime; lexical search still works)
- `migrate` - one-shot job that applies Drizzle migrations before the app starts
- `server` - NestJS HTTP API (`WORKER_ENABLED=false`)
- `worker` - BullMQ consumers (`node dist/worker.main.js`)
- `frontend` - built frontend

`server` and `worker` share the `storage-data` volume. Uploaded documents are
stored on the local filesystem; object storage is not implemented in this build
(`STORAGE_TYPE` values other than `local` are rejected at startup).

## Environment variables

See `.env.example`. The compose file pins `DATABASE_URL`, `REDIS_URL`,
`QDRANT_URL`, `WORKER_ENABLED`, and the storage path itself; everything else is
read from `.env`.

Required:

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` (32+ characters), `AUTH_TRUSTED_ORIGINS`
- `AI_SECRET_ENCRYPTION_KEY` (32 bytes, base64) before firms can store BYOK provider keys
- `VITE_API_BASE_URL` for the frontend

Optional:

- `SERVER_PORT`, `FRONTEND_PORT`, `POSTGRES_PORT`
- `MAIL_TRANSPORT`, `MAIL_DIRECTORY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `DECISION_*`, `EXTRACTION_*`, `EMBEDDING_*` (pipeline routes; disabled when base URLs are empty)
- `ALLOW_PRIVATE_OUTBOUND_URLS` (`auto` by default; production rejects private/loopback outbound targets)
- `WORKER_CONCURRENCY`

## Operations

- Migrations run through the `migrate` service; `server` and `worker` wait for it to
  complete. Run them manually with `pnpm --filter server db:migrate:prod`.
- Health: `GET /api/health` is liveness, `GET /api/health/ready` returns 503 when
  Postgres or Redis is unreachable. The image healthcheck uses the readiness probe.
- The worker has its healthcheck disabled: it serves no HTTP port.
- API and worker can scale independently. Keep `WORKER_ENABLED=false` on API
  replicas and run one or more `worker` processes.
- Firm API keys (`dp_...`) are hashed at rest, accept a `Bearer` token, and are
  limited by scopes such as `matter.read` or `matter.update`.

## Notes

- Dev compose uses mounted source volumes so you can run the server and frontend from containers instead of locally.
- Production compose expects pre-built images from the `build` step.
- Back up the `postgres-data` and `storage-data` volumes together: database rows
  reference files on disk.
