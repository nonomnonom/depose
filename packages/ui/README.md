# @depose/ui

Library komponen UI berbasis [shadcn/ui](https://ui.shadcn.com/) yang dikelola sebagai paket internal di 모노레พ Depose.

## Instalasi

Di dalam paket/workspace lain di `packages/` atau `apps/`, tambahkan dependensi:

```bash
pnpm add @depose/ui
```

atau untuk workspace internal:

```json
"@depose/ui": "workspace:*"
```

## Cara penggunaan

Import komponen dari `@depose/ui`:

```tsx
import { Button, Card, Input } from '@depose/ui';
import '@depose/ui/globals.css';
```

atau import langsung dari path komponen:

```tsx
import { Button } from '@depose/ui/components/button';
import { Card } from '@depose/ui/components/card';
```

## Konfigurasi

Paket ini menggunakan Tailwind CSS v4 dengan CSS variables untuk tema. Pastikan proyek Anda sudah mengkonfigurasi Tailwind CSS dan import `@depose/ui/globals.css` di entry point.

## Pengembangan

Jalankan typecheck:

```bash
pnpm check-types
```

Jalankan build (opsional, untuk validasi bundling):

```bash
pnpm build
```

## Catatan

- Semua komponen berada di `src/components/ui/`.
- Hooks berada di `src/hooks/`.
- Utils berada di `src/lib/`.
- Globals CSS berada di `src/styles/globals.css`.
- Alias di `components.json` dikonfigurasi untuk `@depose/ui/...` agar konsisten dengan nama paket.
