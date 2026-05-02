# Contributing to 0docs

Thanks for helping make 0docs the open, self-hostable visual docs builder.

## Development setup

```sh
bun install
bun run dev
```

Use Node 20+ or Bun 1.1+.

## Project principles

- Preserve the data hierarchy: User → Projects → Pages → Sections → Blocks.
- Keep API calls centralized in `src/app/api/*`; components should not introduce new direct `fetch()` calls.
- Use Tailwind for layout only. Product colors and component styling should come from `zdocs-` tokens and shared CSS.
- Use debounced autosave. Do not add manual save buttons unless a flow is explicitly transactional.
- Keep the exported docs bundle static and portable.
- Do not add analytics, page-view tracking, or search-query logging.

## Pull request checklist

- [ ] The change is scoped and documented.
- [ ] New user-facing behavior is covered by tests or a clear manual QA note.
- [ ] No secrets, private keys, or tokens are committed.
- [ ] No direct edits to generated backend client/types files.
- [ ] Self-hosting behavior remains documented if runtime configuration changes.

## Commit style

Use concise, imperative commit messages:

- `Add navigation metadata badges`
- `Fix branch selector runtime URL`
- `Document Docker deployment`
