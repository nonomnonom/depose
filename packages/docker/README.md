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
- `server` - NestJS backend
- `worker` - background worker process
- `frontend` - built frontend

## Environment variables

See `.env.example`.

Required:

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `DATABASE_URL` for server/worker
- `REDIS_HOST`, `REDIS_PORT`
- `VITE_API_BASE_URL` for frontend

Optional (self-hosting parity with Twenty style):

- `NODE_ENV`
- `NODE_PORT`, `SERVER_PORT`, `FRONTEND_PORT`, `POSTGRES_PORT`, `REDIS_PORT`
- `ENCRYPTION_KEY`, `APP_SECRET`
- `MAIL_TRANSPORT`, `MAIL_DIRECTORY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `STORAGE_TYPE`, `STORAGE_S3_ENDPOINT`, `STORAGE_S3_REGION`, `STORAGE_S3_NAME`, `STORAGE_S3_ACCESS_KEY_ID`, `STORAGE_S3_SECRET_ACCESS_KEY`
- `DISABLE_CRON_JOBS_REGISTRATION`, `CRON_JOB_INTERVAL`

## Notes

- Dev compose uses mounted source volumes so you can run the server and frontend from containers instead of locally.
- Production compose expects pre-built images from the `build` step.
