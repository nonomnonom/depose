# PostHog-style frontend modularization (scope)

Purpose: reorganize the Depose frontend toward PostHog-style module boundaries, naming, and app-shell/UX conventions — without copying PostHog's product surfaces or internal framework choices.

Reference:
`D:\Depose.ai\docs\superpowers\refrences\posthog\frontend\src`

What we actually borrow from PostHog
- Module boundaries are defined by feature ownership, not by file type alone.
- A clear split between primitives/ui, shared app shell, and feature scenes.
- Feature modules own their own types, queries, mutations, small components, and styles where they exist.
- Navigation/sidebar state is derived from scene config + session, not from the router.
- Lists have stable row components, dedicated empty states, and dedicated loading behavior.
- Naming is explicit and stable; avoid generic names that drift as the app grows.

What we do not copy
- Kea-centric logic files and patterns.
- PostHog-branded product naming or PostHog logo/icon usage.
- Any PostHog-specific infrastructure that does not exist in this app.

Current state
- Project root: `packages/frontend`
- UI package: `packages/ui` (`@depose/ui`)
- Main app source: `src/`
- Scenes currently live under `src/scenes/<feature>/` and are mostly single JSX files with a few shared query hooks.
- Shared lib is under `src/lib/` and is already somewhat layered (`lib/components`, `lib/format`, `lib/query`, `lib/api`, `lib/auth`, `lib/notifications`, `lib/config`, `lib/logic`).
- App shell and navigation are under `src/app/` and `src/layout/`.
- The spinner/config cleanup is already done: `BootScreen`, `PageLoading`, and `ClientConfigProvider` no longer use icon-based loaders or hidden config UI.

Goal
Make the frontend easier to navigate and safer to extend by giving each feature a clear module boundary, standard file roles, and consistent app-shell/UX conventions, while keeping existing behavior intact.

Target module boundaries
1. Primitives and shared UI
- Keep `@depose/ui` as the design-system primitive layer.
- In app code, only add thin wrappers when Depose needs behavior or composition that belongs to the product, not to the design system.
- Do not put page-specific layout inside shared primitives.

2. Shared app code
- `src/lib/` stays for cross-cutting utilities and hooks:
  - `lib/api` — HTTP client, errors, endpoint helpers
  - `lib/auth` — session, auth helpers
  - `lib/query` — query client, key factories
  - `lib/format` — dates, sizes, labels
  - `lib/config` — client config provider
  - `lib/notifications` — notification queries/mutations
  - `lib/components` — small shared product components, only if they are genuinely reusable across features
- `src/layout/` stays for shell:
  - `layout/Navigation.tsx`
  - `layout/layout-modes/*`
  - `layout/navigation/*`
  - `layout/PageHeader.tsx`
  - `layout/ErrorPage.tsx`

3. Feature modules
Each feature gets its own module folder with a stable internal structure. Treat scenes, queries, mutations, types, and small feature components as one owned unit.

Suggested module shape for a feature like `facts`:
`src/features/facts/`
- `FactPage.tsx` — main page
- `FactRow.tsx` — row component
- `FactDetail.tsx` — detail, if any
- `queries.ts` — query hooks
- `mutations.ts` — mutation hooks, if they grow
- `types.ts` — shared types for the feature
- `components/` — feature-local components that are not pages
- `index.ts` — public API from the feature, if needed

Suggested module shape for a feature like `documents`:
`src/features/documents/`
- `DocumentsPage.tsx`
- `DocumentRow.tsx`
- `queries.ts`
- `types.ts`
- `components/`

Suggested module shape for matter-level features:
`src/features/matter/summary/`
`src/features/matter/facts/`
`src/features/matter/chronologies/`
`src/features/matter/inconsistencies/`
`src/features/matter/entities/`
`src/features/matter/documents/`
`src/features/matter/subsets/`
`src/features/matter/search/`
`src/features/matter/realtime/`
`src/features/matter/reports/`
`src/features/matter/outputs/`

Suggested module shape for settings:
`src/features/settings/firm/`
`src/features/settings/members/`
`src/features/settings/domains/`
`src/features/settings/ai/`
`src/features/settings/mcp/`
`src/features/settings/profile/`
`src/features/settings/notifications/`
`src/features/settings/appearance/`

Suggested module shape for auth/setup:
`src/features/auth/login/`
`src/features/auth/signup/`
`src/features/auth/setup/`
`src/features/auth/invitation/`

Whether we use `src/features/` or keep `src/scenes/` is a policy choice. The important part is that each feature becomes a folder with owned subfiles, not a loose collection of page files.

Naming rules
- Folder names are kebab-case or lower-case as appropriate to the existing pattern, but stable and consistent within the chosen convention.
- Component files use PascalCase: `FactRow.tsx`, `DocumentsPage.tsx`.
- Non-component files use lower-case kebab-case where it matches the existing codebase: `queries.ts`, `mutations.ts`, `types.ts`.
- Avoid duplicating the folder name as the file name unless it is the canonical page for that feature.
- Avoid generic names like `helpers.ts`, `utils.ts`, `components.tsx` inside a feature module. If something exists, give it a role name.
- Shared components get names that describe what they are, not where they happen to be used: `FactRow`, `DocumentRow`, `EntityDetail`, not `UseFactRow` or `MattersFactsRow`.
- Query/mutation hooks use `use...` naming and live in the feature module unless they are genuinely cross-feature.
- Types for a feature live with that feature, not in a global types folder, unless multiple unrelated features must share them.

App-shell and layout conventions to adopt
- The shell decides layout from scene config, not from URL shape. We already do this in `Navigation.tsx`; keep that model.
- Every feature page should:
  - use `PageHeader` for title/description/actions
  - render one of `PageLoading`, `ErrorState`, or a real empty state
  - avoid ad-hoc loading UI inside the page body when a simple shell-level loading pattern is enough
- List pages should have:
  - a row component
  - a stable empty state message
  - search/filter controls grouped with the list, not scattered across the page
- Tables/lists should be plain accessible HTML where possible: `<table>` for tabular data, `<ul>/<li>` for lists of items that are not strictly tabular. Prefer semantic markup over purely grid/div layouts when the content is actually tabular.
- Sidebar/nav items should be driven from one place per shell context (`navigationLogic.ts` style) so nav labels, icons, permissions, and hrefs stay consistent.
- Modal/dialog-heavy flows should keep the dialog component close to the feature that owns it, not buried in generic UI unless it is truly reusable.

UX conventions to adopt
- Loading is a spinner with optional label, not an icon-plus-label hybrid.
- Empty states explain what the user can do next, not just that something is empty.
- Errors include retry where retry is reasonable; otherwise include a clear way out.
- Actions are labelled by what they do in the product, not by implementation.
- Access-controlled UI hides actions the user cannot perform; it does not primarily rely on disabling for permission enforcement.
- Matter pages keep matter context in the shell; scene pages receive params and do not own routing logic.

Files not to touch in this work
- Do not change `packages/ui` design-system components unless a Depose-specific wrapper is actively needed.
- Do not rename/reference PostHog product names in Depose code.
- Do not introduce a new state/loader framework just to match PostHog; keep TanStack Query and existing patterns unless a specific gap justifies a change.

Migration order
1. Decide the final top-level convention: `src/features/<domain>/` vs keeping `src/scenes/<domain>/` but making each a real module folder.
2. Pick one shared primitive or wrapper question first:
   - what belongs in `@depose/ui` vs a thin app wrapper
   - whether `lib/components` should keep `FormField` and a few others, or move toward feature-owned form components
3. Split one large scene file into a module with page + row + queries + types.
4. Split the next largest scenes using the same internal shape.
5. Move shared hooks/types into `lib/` only if they are reused across features.
6. Normalize navigation/sidebar entries and breadcrumb rules in one place.
7. Normalize loading/empty/error patterns page by page, only where current behavior is inconsistent.
8. Run type checks and lint after each change; do not batch many moves without verification.

Acceptance criteria for this task
- The frontend can be read top-down: it is obvious where a feature lives and what inside it is a page, a query, a component, or a type.
- Feature modules are self-contained enough that adding a new page or row does not require editing unrelated folders.
- App shell behavior is unchanged for existing scenes, except for intended normalization.
- No PostHog branding, logos, or PostHog-specific naming is introduced.
- `npm run check-types` and `npm run lint` stay green after each migration step.

Suggested first concrete target
Start with the largest matter feature modules first, because they have the most page/row/detail/dialog split opportunities:
- `matter/inconsistencies` (already has a dialog + table-like layout)
- `matter/entities` (detail panel + create dialog)
- `matter/documents` (file list + upload + row actions)
- `matter/chronologies` (grouped timeline markup)
- `matter/summary` (themes + key facts sections)

After that, move to settings scenes and auth scenes, which are smaller and easier to normalize.

Notes for implementation
- Move files with git-friendly renames where possible, so history is preserved.
- Update imports in the same pass as the move, and verify with type checks.
- Keep each migration step small enough to revert easily.
- Do not mix this refactor with unrelated feature work.
