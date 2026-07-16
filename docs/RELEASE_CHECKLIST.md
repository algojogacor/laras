# Private Beta Release Checklist

- [ ] Configure `AUTH_SECRET`, `DATABASE_URL`, and private-beta allowlist.
- [ ] Run `bun install --frozen-lockfile`, Prisma generate/validate, typecheck, lint, tests, and build.
- [ ] Run `bun test` three times and compare totals.
- [ ] Perform the manual QA checklist on desktop and mobile, in ID and EN, light and dark.
- [ ] Verify no `.env`, local DB, logs, or build artifacts are committed.
- [ ] Confirm staging credentials and external capability status before calling the release candidate.
