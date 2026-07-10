# DECISIONS.md

Record of architecture and product decisions — valid, superseded, and requiring confirmation.

---

## Valid decisions (remain in force)

### D1. Next.js 16 + Turbopack + TypeScript 5 + Prisma 6
- **Decision**: The tech stack from the ZIP is the baseline. Next.js 16 App Router, Turbopack dev, TypeScript strict, Prisma with driverAdapters.
- **Rationale**: The brief (§2) designates the ZIP as the single source of truth. The stack is mature and matches the brief's requirements.
- **Must not change casually**: Yes — changing the framework would reset the entire codebase.

### D2. shadcn/ui (New York) + Tailwind CSS 4 + Lucide icons
- **Decision**: UI component library is shadcn/ui with the New York style. Tailwind CSS 4 for styling. Lucide for icons.
- **Rationale**: Pre-existing in the ZIP. Consistent, accessible, well-maintained.
- **Must not change casually**: Yes — would require rewriting all components.

### D3. i18n: ID/EN bilingual via cookie + dictionary
- **Decision**: Locale stored in `laras_locale` cookie. Dictionary in `src/lib/i18n/dictionary.ts`. Server + client share the same dictionary.
- **Rationale**: Brief §9 requires Indonesia-first with English support. The cookie approach ensures SSR/CSR agreement.
- **Must not change casually**: Yes — deeply integrated.

### D4. z-ai-web-dev-sdk for AI (auto-configured)
- **Decision**: AI generation uses `z-ai-web-dev-sdk` via `ZAI.create()` with auto-configuration. No explicit API key in .env.
- **Rationale**: The SDK auto-configures in this sandbox environment. Verified working (document generation, interview questions, English practice all return valid LLM output).
- **Must not change casually**: No — but document that the AI provider is ZAI and that generation quality depends on it.

### D5. Git strategy: commit on `main`, push `main:upgrade/laras-100x`
- **Decision**: The sandbox auto-switches the working branch to `main` between commands. All commits land on `main`. Publish with `git push origin main:upgrade/laras-100x` (never push `main` itself, never force-push).
- **Rationale**: Sandbox-enforced. Verified in SURFACE-0.
- **Must not change casually**: Yes — the sandbox behavior dictates this.

### D6. Auth: custom JWT (jose) + bcrypt, not NextAuth
- **Decision**: Authentication is a custom implementation using `jose` for JWT signing/verification and `bcryptjs` for password hashing. Sessions are 30-day httpOnly cookies.
- **Rationale**: Pre-existing in the ZIP. NextAuth is available but not used.
- **Requires owner confirmation**: Whether to migrate to NextAuth v4 (available in package.json) for MFA, session management, and OAuth. The custom impl lacks MFA and step-up auth.

---

## Superseded decisions

### S1. Turso remote database as runtime DB
- **Superseded by**: Local SQLite (`file:/home/z/my-project/db/custom.db`).
- **Reason**: The sandbox shell environment overrides `DATABASE_URL` to a local file path. The Turso credentials in `.env` are unused at runtime.
- **Implication**: The DB is local and ephemeral. Not suitable for production. The Turso credentials should either be re-activated for production or removed to avoid confusion.
- **Requires owner confirmation**: Should production use Turso (libSQL) or a different Postgres provider? The Prisma schema uses SQLite types (no native arrays, no enums).

### S2. `next.config.ts` `ignoreBuildErrors: true`
- **Superseded by**: The option is commented out. Type errors now fail the build.
- **Reason**: SURFACE-0 documented that ignoring build errors masks type regressions.
- **Implication**: The build currently fails due to 10 pre-existing type errors (Phase 1A will fix).

### S3. Worklog as the source of truth
- **Superseded by**: `/docs/CURRENT_STATE.md`, `/docs/ARCHITECTURE_GAPS.md`, `/docs/PHASE_PLAN.md`, `/docs/DECISIONS.md`.
- **Reason**: The worklog contains stale status, superseded decisions, and inaccurate completion claims (per this audit). It is historical evidence only.

### S4. prisma:query logging enabled in dev
- **Status**: Active but should be gated.
- **Reason**: `src/lib/db.ts` logs all queries in dev mode. This is extremely noisy and obscures real errors in `dev.log`.
- **Recommendation**: Gate behind a `VERBOSE_DB` env flag.

---

## Assumptions requiring owner confirmation

### A1. SQLite versus Turso for production
- **Current**: Local SQLite at runtime; Turso credentials in .env but unused.
- **Question**: Should the production deployment use Turso (libSQL), or migrate to Postgres?
- **Impact**: If Postgres, the Prisma schema needs updating (SQLite has no native enums/arrays). If Turso, the schema is compatible but the driverAdapter stays.
- **Recommendation**: Stay on SQLite/Turso (libSQL) for pre-production. Decide Postgres migration before production launch.

### A2. Supabase Storage usage
- **Current**: `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SECRET_KEY` are in .env. `src/lib/supabase.ts` exists. Used for file uploads (profile photos, etc.).
- **Question**: Is Supabase Storage the intended production storage provider? Are the current credentials valid?
- **Impact**: If credentials are expired/invalid, file uploads will fail silently.
- **Recommendation**: Verify Supabase credentials are valid; test an upload. If not, fall back to local file storage for pre-production.

### A3. Static listening audio versus runtime TTS
- **Current**: 15 pre-generated MP3 files in `public/audio/listening/`. A `tts-service` mini-service exists but is not running. `src/lib/tts-edge.ts` exists as an alternative.
- **Question**: Should listening audio be pre-generated (current) or generated on-demand via TTS at runtime?
- **Impact**: Pre-generated is reliable but limited to 15 items. Runtime TTS scales but depends on the TTS service running.
- **Recommendation**: Keep pre-generated for pre-production. Plan runtime TTS for scale (Phase 10B).

### A4. Current AI provider capabilities
- **Current**: `z-ai-web-dev-sdk` auto-configured. Verified for text generation (CV, cover letter, essay, interview questions, English practice).
- **Question**: Does the owner want to support multiple AI providers, or is ZAI the sole provider?
- **Impact**: If multi-provider, need an abstraction layer. If sole, the current direct usage is fine.
- **Recommendation**: Keep ZAI as sole provider for pre-production. Add an abstraction layer if provider switching is likely.

### A5. Role model: 3 roles vs 4 roles
- **Current**: `user` / `admin` / `owner`. No `moderator`.
- **Question**: Confirm the 4-role model (OWNER/ADMIN/MODERATOR/USER) per §17.1.
- **Impact**: Phase 1D adds MODERATOR. Permission model (Phase 4A) depends on this.
- **Recommendation**: Confirm 4-role model. Add MODERATOR in Phase 1D.

### A6. Verification semantics
- **Current**: 5/6 badge types auto-derive "verified" from self-declared profile data. Only identity is admin-issuable.
- **Question**: Should auto-derived badges be labeled "verified" or "self-declared"? The brief (§19) requires real verification provenance.
- **Impact**: If "verified" is reserved for admin-verified, the dashboard trust score drops significantly. If self-declared is acceptable, the current implementation is fine (with relabeling).
- **Recommendation**: Relabel auto-derived badges as "self-declared" (not "verified"). Reserve "verified" for admin-issued badges. Phase 2A (Evidence) adds real provenance.

### A7. License model versus full license-code system
- **Current**: `License` model is admin-granted only. No code redemption.
- **Question**: Is the full License Code System (§25 — individual/batch/campaign/trial/sponsored codes) required for pre-production?
- **Impact**: If yes, Phase 5A is a significant build. If no, admin-granted licenses suffice for pre-production.
- **Recommendation**: Admin-granted for pre-production. Build the full code system in Phase 5A before public launch.

### A8. Dashboard status: prototype versus final
- **Current**: The dashboard is a prototype with real but shallow data (readiness score from activity counts, trust score from auto-derived badges, activity timeline from on-the-fly queries).
- **Question**: Confirm the dashboard is a prototype, not the final integration layer.
- **Impact**: The brief (§9.1, §12) envisions the dashboard as the final integration layer reading from stable data sources. Phase 9A rebuilds it after data sources are stable.
- **Recommendation**: Confirm prototype status. Do not polish until Phase 9A.

### A9. Branch and Git strategy
- **Current**: Working on `main` (sandbox-enforced), pushing to `origin/upgrade/laras-100x`. No PRs. No force-push.
- **Question**: Confirm this strategy is correct per the brief (§4.1).
- **Impact**: The brief says "Use exactly one branch: upgrade/laras-100x." The sandbox forces `main` locally. The push convention `main:upgrade/laras-100x` achieves the same remote result.
- **Recommendation**: Confirm. Continue pushing `main:upgrade/laras-100x`.

---

## Architecture choices that must not be changed casually

### C1. Prisma as the data layer
- The entire data model, 27 models, and all 42 API routes depend on Prisma. Switching ORMs would reset the backend.

### C2. App Router (not Pages Router)
- All routes use Next.js 16 App Router. Server components, client components, route handlers. Reverting to Pages Router is not feasible.

### C3. Cookie-based JWT sessions (not server sessions)
- The auth model is stateless JWT in httpOnly cookies. Adding server-side sessions would require a session store (Redis/DB) and re-architecting auth.

### C4. Consent/Privacy Graph as the privacy primitive
- The `ConsentSetting` model + `filterProfileByConsent` pattern is the foundation for all privacy. Do not replace with ad-hoc field-level checks.

### C5. Entitlement engine as the access primitive
- The `getEntitlement` + `hasFeature` pattern is the foundation for all feature gating. Do not revert to hardcoded `if (plan === "pro")` checks. (The current implementation is shallow but the pattern is correct — Phase 3C/5C deepens it.)

### C6. i18n dictionary pattern
- The single-dictionary, cookie-locale pattern is deeply integrated. Do not switch to a library (next-intl, i18next) without a full migration plan.

### C7. No payment gateway
- The brief (§25) explicitly prohibits payment gateways, credit-card checkout, and auto-renewal. The license-code system is the monetization mechanism. Do not add payment processing.
