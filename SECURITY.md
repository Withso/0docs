# Security Policy

## Reporting vulnerabilities

Please report suspected vulnerabilities privately to the maintainers before public disclosure.

Include:

- Affected area or route.
- Reproduction steps.
- Impact and any known workarounds.
- Whether the issue affects hosted, self-hosted, or exported static docs.

## Security expectations

- Never store roles on profile/user rows. Roles belong in `user_roles`.
- Never trust client-side admin checks.
- Keep service-role keys only in backend function runtimes.
- Keep row-level security enabled for user data tables.
- Do not log search queries, page views, private docs content, access tokens, or GitHub tokens.
