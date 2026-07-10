# Laras — Product Audit (Founder-Level)

**Date:** 2026-07-10
**Auditor:** Z.ai Code (acting as Founder + Principal Eng + QA Lead + Product Designer)

---

## 1. Positioning

**Laras** = "Career & Opportunity Readiness Ecosystem" — a single living profile that powers five integrated verticals. Tagline (ID): *"Selaraskan dirimu menuju kesempatan berikutnya."* / (EN): *"Tune yourself toward what's next."*

Differentiator vs. resume builders: **one profile → many outputs**, with a hard rule of *verification before generation* (the system never invents personal details; if data is missing it asks).

## 2. Target users

- Indonesian job-seekers and students preparing for work, orgs, scholarships, volunteer roles.
- Bilingual (ID/EN) — defaults to Indonesian.
- People who want a coherent prep toolkit, not 5 disconnected apps.

## 3. Core problem solved

Fragmented preparation: CVs, cover letters, interview prep, application tracking, English practice, and essays live in separate tools with duplicated data. Laras unifies them on one profile so every output is consistent and editable.

## 4. Feature inventory (5 verticals + shared)

### Vertical 1 — Document Suite
- CV ATS-friendly, CV Visual, Cover Letter, Personal Deck, Bio, Essay
- Configurable generation (tone, region, locale), edit-before-generate, version history, restore/revert, follow-up revision loop, DOCX/PPTX export
- **Status:** UI complete; generation requires `ZAI_API_KEY` (currently blocked)

### Vertical 2 — Application Ops
- Kanban board for applications (job/org/scholarship/volunteer), deadline alerts
- **Status:** UI present (`applications-board.tsx`); not browser-verified this round

### Vertical 3 — Interview Prep
- Role-targeted question sets, answer builder, AI feedback
- **Status:** UI present; generation requires `ZAI_API_KEY`

### Vertical 4 — English Readiness
- TOEFL/IELTS-style Reading, Structure, Listening; difficulty levels; scoring; certificates; listening audio bank
- **Status:** UI + scoring + certificate + listening bank present; question generation requires `ZAI_API_KEY`; audio bank has local + Supabase fallback

### Vertical 5 — Opportunity Essays
- Scholarship/org essays with strict verification
- **Status:** Builder present; generation requires `ZAI_API_KEY`

### Shared
- Auth (email/password, JWT session cookie), onboarding wizard (5 steps), profile editor, dashboard, settings, i18n (ID/EN), theme, locale toggle, command palette (planned)

## 5. Strongest parts

1. **Coherent architecture** — one `UserProfile` model (Prisma) as single source of truth; all verticals read from it.
2. **Bilingual i18n** — full ID/EN dictionary, cookie-based locale, SSR+CSR agreement.
3. **Verification-before-generate principle** — embedded in content-engine; reduces AI hallucination of personal facts.
4. **Version history + restore/revert** — document safety net; rare in MVP-stage tools.
5. **Configurable generation** — tone/region/locale knobs per document.
6. **Production DB** — Turso/libSQL is live and verified (read+write).

## 6. Weakest parts

1. **AI verticals are unverified** — the core value (generation) is blocked by missing `ZAI_API_KEY`. Until provided, the product is a well-built shell.
2. **No automated tests** — zero unit/integration tests; regression risk is high.
3. **`ignoreBuildErrors: true`** — type safety can silently regress in CI.
4. **No rate limiting / abuse protection** on auth and generation endpoints.
5. **Supabase DB migration deferred** — data lives on Turso (fine) but the dual-path (local + Supabase Storage) adds complexity.
6. **Onboarding is heavy** — 5 steps, 31KB wizard component; completion-rate risk.
7. **No observability** — no structured logging/metrics beyond `console.error`.

## 7. Incomplete user journeys

- **New user → first generated document:** blocked at the LLM step (no key). The journey exists in code but can't be completed.
- **English practice → certificate:** generation blocked; scoring + certificate issuance code exists but can't run E2E.
- **Application → linked document:** `ApplicationDocument` relation exists; UI linkage not browser-verified.
- **Mobile:** responsive classes present but not explicitly tested on mobile widths.

## 8. Features not yet delivering value

- **Command palette** — referenced in task list but not found in routes; likely not implemented.
- **Notification center** — referenced; not verified.
- **Achievement system** — model exists (`Achievement`); UI not verified.
- **Collaboration** — referenced in task list; not found.

## 9. Simplification opportunities

- Remove `ignoreBuildErrors: true` now that typecheck is clean — fail fast on regressions.
- Consolidate the dual Supabase/Turso storage path once a decision is made (keep Turso as DB, Supabase as Storage only — already the case; just document it).
- The `upload/` and `tool-results/` tracked junk on `main` should be purged (done on restore branch).

## 10. Differentiation opportunities

- **Verifiable AI** — lean harder into "we never invent your details" as a trust marker (audit log of what AI used vs. what you provided).
- **One-click multi-output** — from one profile, generate CV + cover letter + deck in one action.
- **Indonesian-first** — most global tools are EN-first; Laras's ID-default is a real wedge.
- **Certificate verification** — public `/verify/certificate/[code]` page exists; a real trust feature.

## 11. Product risks

- **Dependency on a single LLM key** — if `ZAI_API_KEY` is unavailable, 4 of 5 verticals are dead. Need graceful degradation + clear messaging.
- **Onboarding fatigue** — 5 steps before value; high drop-off risk.
- **Scope creep** — 5 verticals is a lot for an MVP; risk of none being excellent.
- **No mobile QA** — Indonesian users are mobile-first.

## 12. Technical risks

- No tests → regression risk.
- No rate limiting → abuse.
- `AUTH_SECRET` static dev value (runtime only, but should be random in prod).
- Turso is the sole DB; no backup strategy documented.
- Bundle size unmeasured; onboarding wizard is large.

## 13. Priority recommendations

1. **Provide `ZAI_API_KEY`** and run full E2E QA on all generation flows (highest leverage).
2. **Remove `ignoreBuildErrors`** + add a typecheck step to CI.
3. **Add rate limiting** to auth + generation endpoints.
4. **Add smoke tests** for auth + DB + one generation flow.
5. **Mobile QA pass** on all verticals.
6. **Merge restore branch** to main to get the Turso runtime fix + clean typecheck.
