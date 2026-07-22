# Mindi

Offline mind-map web app. Local-only Maps of hierarchical Markdown Nodes on a canvas.

## Setup

```bash
corepack enable
pnpm install
pnpm dev
```

## Scripts

| Command             | Purpose                        |
| ------------------- | ------------------------------ |
| `pnpm dev`          | Local development server       |
| `pnpm build`        | Typecheck and production build |
| `pnpm lint`         | ESLint                         |
| `pnpm format:check` | Prettier check                 |
| `pnpm test`         | Vitest unit tests              |
| `pnpm test:e2e`     | Playwright browser tests       |

Requires Node 22+ (see `.node-version`).
