# Laras — Roadmap

**Last updated:** 2026-07-10
**Source of truth:** this file + `worklog.md` + `QA_REPORT.md` + `PRODUCT_AUDIT.md`

Scoring: Impact (1-5), Confidence (1-5), Effort (1-5, higher=more), Risk (1-5, higher=more).

---

## NOW (most urgent + highest leverage)

### N1 — Merge restore branch to main & clean junk
- **Problem:** `main` lacks the critical Turso runtime fix (db.ts prefers shell-injected local sqlite → app won't connect to Turso at runtime in this sandbox); main also tracks 24 junk `upload/`+`tool-results/` files.
- **Users affected:** all runtime users in this environment.
- **Solution:** merge `restore/laras-20260710-b` (`2818c98`) into `main` after review.
- **Why now:** unblocks all runtime testing.
- **Impact 5 | Confidence 5 | Effort 1 | Risk 1**
- **Acceptance:** `main` HEAD connects to Turso at runtime; typecheck/lint/build pass; no junk tracked.
- **Test:** `bun run scripts/db-smoke.ts`; `tsc --noEmit`; `next build`; browser signup→onboarding.

### N2 — Provide ZAI_API_KEY + full E2E QA of generation
- **Problem:** 4 of 5 verticals blocked at the LLM call; core value unverified.
- **Users affected:** every user trying to generate a document/practice.
- **Solution:** set `ZAI_API_KEY` in runtime env; run E2E QA on CV-ATS, cover-letter, essay, English practice, interview generation.
- **Why now:** without this, the product is a shell.
- **Impact 5 | Confidence 4 | Effort 2 | Risk 2** (needs key from operator)
- **Acceptance:** each generation flow produces a valid document/practice set; errors are graceful.
- **Test:** agent-browser through each builder; verify DB writes + export.

### N3 — Remove `ignoreBuildErrors` + CI typecheck gate
- **Problem:** `next.config.ts` `typescript.ignoreBuildErrors: true` masks type regressions.
- **Users affected:** developers (regression risk → users).
- **Solution:** remove the flag; add `tsc --noEmit` to a pre-commit/CI check.
- **Impact 4 | Confidence 5 | Effort 1 | Risk 1**
- **Acceptance:** `next build` fails on type errors; typecheck clean.
- **Test:** introduce a type error → build fails; revert → passes.

### N4 — Rate limiting on auth + generation endpoints
- **Problem:** `/api/auth/signup`, `/api/auth/login`, `/api/documents/*/generate`, `/api/english/generate` have no rate limit → abuse risk.
- **Users affected:** all (DoS/brute-force/abuse).
- **Solution:** lightweight in-memory rate limiter (IP+endpoint) since stack specifies local-memory caching.
- **Impact 4 | Confidence 4 | Effort 3 | Risk 2**
- **Acceptance:** >N requests/min from same IP returns 429; legitimate use unaffected.
- **Test:** burst requests → 429; normal flow → 200.

---

## NEXT (after NOW stabilizes)

### X1 — Smoke test suite (auth + DB + one generation)
- **Problem:** zero automated tests.
- **Solution:** add a small Vitest/Bun-test suite covering signup, session, profile, and one document generation (mocked LLM).
- **Impact 4 | Confidence 4 | Effort 4 | Risk 2**
- **Acceptance:** `bun test` passes; covers happy + one failure path per area.

### X2 — Graceful AI degradation + user-facing error states
- **Problem:** if LLM fails, user sees a generic 502; no retry/guidance.
- **Solution:** standardized error envelope with code+message+retry; UI shows actionable error + retry button.
- **Impact 4 | Confidence 4 | Effort 3 | Risk 2**
- **Acceptance:** LLM failure → UI shows clear message + retry; no white screen.

### X3 — Mobile responsive QA pass
- **Problem:** mobile not verified; Indonesian users are mobile-first.
- **Solution:** agent-browser at 375px width across all verticals; fix layout/overflow/touch targets.
- **Impact 4 | Confidence 4 | Effort 3 | Risk 1**
- **Acceptance:** all pages usable at 375px; no horizontal scroll; 44px touch targets.

### X4 — High-entropy AUTH_SECRET + env validation
- **Problem:** AUTH_SECRET is a static dev string; no env validation at boot.
- **Solution:** generate random AUTH_SECRET in production; validate required env vars at startup with a clear error.
- **Impact 3 | Confidence 5 | Effort 2 | Risk 1**
- **Acceptance:** missing required env → app fails fast with a clear message.

### X5 — Onboarding completion optimization
- **Problem:** 5-step onboarding risks drop-off.
- **Solution:** progress indicator (exists), allow skip-with-later-completion, show value preview per step, measure completion.
- **Impact 3 | Confidence 3 | Effort 4 | Risk 2**
- **Acceptance:** skip works; dashboard prompts to complete missing profile sections.

---

## LATER (valuable but not urgent)

### L1 — Public certificate verification polish
- `/verify/certificate/[code]` exists; make it shareable, printable, with QR code.
- **Impact 3 | Confidence 4 | Effort 3 | Risk 1**

### L2 — One-click multi-output
- From profile, generate CV + cover letter + deck in a single action.
- **Impact 4 | Confidence 3 | Effort 4 | Risk 2**

### L3 — Audit trail of AI vs. user-provided content
- Log which document lines came from the LLM vs. the profile (trust feature).
- **Impact 3 | Confidence 3 | Effort 5 | Risk 2**

### L4 — Command palette + notification center
- Referenced in original task list but not implemented; add cmdk-based palette + a notification center.
- **Impact 3 | Confidence 4 | Effort 4 | Risk 1**

### L5 — Observability
- Structured logging (pino), request IDs, basic metrics.
- **Impact 3 | Confidence 4 | Effort 3 | Risk 1**

### L6 — Backup & recovery docs
- Document Turso backup strategy + restore procedure.
- **Impact 3 | Confidence 5 | Effort 1 | Risk 1**

---

## NOT PLANNED (intentionally out of scope to stay focused)

- **Supabase Postgres DB migration** — Turso/libSQL works well; migration adds risk without clear benefit. Keep Supabase for Storage only.
- **Auto-apply bot** — explicitly against positioning ("Bukan auto-apply bot").
- **Paid pricing / payments** — not now; focus on product fit first.
- **Collaboration / multi-user editing** — referenced in task list but diverges from single-user-profile model; deferred unless clear demand.
- **Changing authentication provider** — current JWT+cookie works; no need to swap to NextAuth/Supabase Auth now.
