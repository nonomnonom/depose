# @depose/ui

Internal [shadcn/ui](https://ui.shadcn.com/) component package for the Depose
monorepo.

## Install

Add the dependency to another workspace under `packages/` or `apps/`:

```bash
pnpm add @depose/ui
```

or, for an internal workspace:

```json
"@depose/ui": "workspace:*"
```

## Usage

Import components from the package root:

```tsx
import { Button, Card, Input } from '@depose/ui';
import '@depose/ui/globals.css';
```

Or import a component directly:

```tsx
import { Button } from '@depose/ui/components/button';
import { Card } from '@depose/ui/components/card';
```

## Configuration

The package uses Tailwind CSS v4 with CSS variables for theming. The consuming
app must configure Tailwind CSS and import `@depose/ui/globals.css` in its
entry point.

## Development

Typecheck:

```bash
pnpm check-types
```

Build (optional, to validate bundling):

```bash
pnpm build
```

## Layout

- Components live in `src/components/ui/`.
- Hooks live in `src/hooks/`.
- Utilities live in `src/lib/`.
- Global CSS lives in `src/styles/globals.css`.
- `components.json` aliases use `@depose/ui/...`.

All user-facing copy in the package is English; there is no localization layer.
