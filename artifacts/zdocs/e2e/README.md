# Docs viewer end-to-end tests

These specs validate the public docs viewer (`/docs` and `/p/:slug`) against
the accessibility and interaction contract from Task #24.

The repository does not bundle a Playwright runner. To execute the specs
locally:

```bash
pnpm dlx playwright install --with-deps
pnpm dlx playwright test artifacts/zdocs/e2e --base-url http://localhost:5173
```

`docs-a11y.spec.ts` covers:

- Page landmarks (`header`, `nav[aria-label="Docs"]`, `main#content-area`,
  optional `aside[aria-label="On this page"]`).
- Skip-to-content link is the first focusable element and lands focus in
  `<main>`.
- Header tabs are a `role="tablist"` with arrow / Home / End nav.
- Theme toggle announces the new theme via `role="status" aria-live="polite"`.
- Search dialog opens with Cmd/Ctrl+K, traps focus, closes on Escape.
- Sidebar group toggles flip `aria-expanded` on click.
- Mobile drawer is `role="dialog" aria-modal="true"` with focus trap.
- Initial `/docs` render produces no console errors.
