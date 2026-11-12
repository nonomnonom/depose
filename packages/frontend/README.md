# Depose frontend

React 19 + Vite workspace for Depose. It is server-driven: the UI does not read
feature flags from build-time variables. `GET /api/v1/tenant` supplies the firm,
auth capabilities, AI availability, and setup state, and the client adapts
routes and screens to that response.

## Run locally

```sh
# from the repository root
pnpm install
pnpm --filter @depose/docker dev:infra

cd packages/server && pnpm dev     # API on :3000

cd ../frontend
pnpm dev                           # http://localhost:5173
```

Vite proxies `/api` to `http://localhost:3000` with `changeOrigin: false`, so
the API sees the original host and can resolve the firm by hostname. In
production the same reverse proxy must preserve the host.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Vite dev server with API proxy |
| `pnpm check-types` | `tsc --noEmit` |
| `pnpm build` | Typecheck, bundle, and copy assets |
| `pnpm generate:api` | Regenerate the Orval client from `../server/openapi.json` |

## Configuration

There are no frontend feature env vars. Build-time configuration is limited to
the API proxy in `vite.config.ts`. Everything user-visible comes from the
server:

- `firmName` and `requiresSetup` for onboarding.
- `auth.passwordLogin`, `auth.ssoLogin`, `auth.ssoRequired`,
  `auth.selfSignup`, `auth.emailVerification`, `auth.mailConfigured`.
- `ai.enabled` for grounded chat and AI settings.
- `mcpServer.enabled` for the MCP settings surface.

This keeps an operator from having to rebuild the frontend to change SSO,
signup, or model availability. See
[`docs/01-client-config.md`](docs/01-client-config.md).

## Documentation

- [`docs/README.md`](docs/README.md) - index and diagram map
- [`docs/01-client-config.md`](docs/01-client-config.md) - flags and UX behaviour
- [`docs/02-auth-ux.md`](docs/02-auth-ux.md) - login, SSO, invitation, setup
- [`docs/03-user-journeys.md`](docs/03-user-journeys.md) - first run to live review
- [`docs/04-architecture.md`](docs/04-architecture.md) - providers, routes, data flow
- [`docs/05-matter-workspace.md`](docs/05-matter-workspace.md) - matter screens and evidence flow
