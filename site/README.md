# 0docs marketing site

Standalone one-page marketing site, decoupled from the main monorepo. Deployed
to Cloudflare Pages with this directory as the build root.

## Local development

```bash
pnpm install        # or npm install / yarn
pnpm dev            # http://localhost:5174
```

## Production build

```bash
pnpm build          # writes ./dist
pnpm preview        # serves the build locally
```

## Cloudflare Pages settings

| Field            | Value          |
| ---------------- | -------------- |
| Root directory   | `site`         |
| Build command    | `npm run build`|
| Build output     | `dist`         |
| Node version     | `20` or newer  |

No environment variables required. No client-side routing — single static
`index.html`, so no `_redirects` file is needed.
