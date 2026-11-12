# Frontend documentation

The frontend is a server-driven workspace. Each document describes what a user
sees for a given server configuration and where the decision lives in code.

| Doc | Covers | Diagram |
| --- | --- | --- |
| [01-client-config](01-client-config.md) | Which tenant flags change the UI | Flowchart |
| [02-auth-ux](02-auth-ux.md) | Login, SSO, invitation, first-run setup | Flowchart + sequence |
| [03-user-journeys](03-user-journeys.md) | End-to-end experience by role | User journey |
| [04-architecture](04-architecture.md) | Providers, router, scenes, API client | Component + sequence |
| [05-matter-workspace](05-matter-workspace.md) | Evidence review, analysis, live mode | Flowchart |

## Source layout

- `src/index.tsx` - router and provider tree.
- `src/layout` - auth shell, app shell, matter shell, settings shell, theme.
- `src/scenes` - route-level screens.
- `src/lib/config` - server config to client feature flags.
- `src/lib/api`, `src/lib/query`, `src/lib/auth` - fetch envelope, query keys,
  session and guards.
- `src/generated` - Orval client and schemas. Regenerate; do not hand-edit.

All user-facing copy is English. There is no localization layer.
