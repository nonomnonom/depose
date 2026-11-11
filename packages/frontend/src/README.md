# Frontend ownership

The frontend is feature-first. Each folder has one owner and one reason to change.

```
src/
  index.tsx              route map, providers, mount. No UI beyond composition.
  generated/             Orval output. Never edit by hand; run `pnpm generate:api`.
  types.ts               aliases over generated API types.

  layout/                app chrome. No domain data beyond what the shell needs.
    app-shell/           sidebar, topbar, command palette, navigation, theme, user menu.
    matter/              matter header and section navigation.
    settings/            settings secondary navigation.
    auth/                auth rail and form frame.
    PageHeader.tsx       shared page title row.
    ErrorPage.tsx        route error, 403, 404, tenant, maintenance states.
    ThemeProvider.tsx    theme state and persistence.

  scenes/                one folder per product feature.
    <feature>/
      <Feature>Page.tsx  route entry for the feature.
      <feature>.queries.ts  TanStack Query hooks owned by the feature.
      components/        feature-only components.
      schemas/           Zod form schemas.
      types.ts           local unions or view models.

  lib/                   cross-cutting code with no feature ownership.
    api/                 fetch mutator and typed API errors.
    auth/                session context, guards, Better Auth calls.
    config/              client config and feature flags.
    query/               query client and shared query keys.
    components/          generic patterns: EmptyState, PageSkeleton, FormField.
    format/              dates, initials.
```

## Rules

- Route components live in `scenes/<feature>`. `index.tsx` only wires them.
- Feature data hooks live beside the feature (`*.queries.ts`), not in a global queries folder.
- `layout/` never imports a feature scene. Shells receive data through context or their own small queries.
- Cross-feature primitives go in `lib/`. Visual primitives come from `@depose/ui`, never a local copy.
- Shared query keys stay in `lib/query/keys.ts`; feature-specific keys can stay in the feature.
- Generated types are the source of truth for API shapes. Do not duplicate DTOs by hand.
- Copy is English, sentence case, specific. No placeholder marketing text or fake buttons.
- Empty, loading, and error states are part of the feature, not an afterthought.
