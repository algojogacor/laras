# DECISIONS.md

Record of architecture and product decisions — valid, superseded, and requiring confirmation.

**Canonical master prompt:** `docs/MASTER_PROMPT.md` (4088 source lines, SHA-256 `64948d6e574054b1194f62f6d99ce0d64a32f4bf8e3408dbe130b556d9369905`). All decisions below are evaluated against this document.

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

### D7. Phase 1B public-profile consent authorization matrix
- **Decision**: Public-profile data must cross the Server Component / Client Component boundary only through one narrowly typed, server-only projection. The projection derives the viewer from the server session and treats only an explicit, unique `accepted` relationship as connection access.
- **Supported stored visibility values**: `public`, `connections`, and `private`.
- **Viewer classifications**: `OWNER`, `ACCEPTED_CONNECTION`, `PENDING_CONNECTION`, `AUTHENTICATED_STRANGER`, and `ANONYMOUS`.
- **Fail-closed rule**: Pending (incoming or outgoing), declined, blocked, duplicated, malformed, unknown, missing, or unresolved relationship state never grants connection access. Missing consent rows use the documented conservative defaults. Unknown or duplicated consent values omit that controlled field for non-owners.

| Field | Stored visibility | Owner | Accepted connection | Pending connection | Authenticated stranger | Anonymous | Current behavior before Phase 1B | Required behavior |
|---|---|---:|---:|---:|---:|---:|---|---|
| Name | `fullName`; default `public` | Include | By visibility | Public only | Public only | Public only | Always rendered and raw value serialized even when restricted | Consent-controlled and omitted when unauthorized |
| Headline | Not consent-controlled | Include | Include | Include | Include | Include | Always serialized | Intentionally always public |
| Summary | No ConsentSetting field | Include | Omit | Omit | Omit | Omit | Visually hidden for non-owner but raw value serialized | Owner-only until a future phase adds explicit consent semantics |
| Avatar | Not consent-controlled | Include | Include | Include | Include | Include | Always serialized | Intentionally always public; URL only, no upload metadata |
| Location | `location`; default `connections` | Include | By visibility | Public only | Public only | Public only | UI-gated but raw value serialized | Consent-controlled and omitted when unauthorized |
| Email | `email`; default `private` | Include | By visibility | Public only | Public only | Public only | UI-gated but raw value serialized | Consent-controlled and omitted when unauthorized |
| Phone | `phone`; default `private` | Include | By visibility | Public only | Public only | Public only | UI-gated but raw value serialized | Consent-controlled and omitted when unauthorized |
| Website and social links | `links`; default `connections` | Include | By visibility | Public only | Public only | Public only | UI-gated but raw JSON object serialized | Consent-controlled; parsed allowlisted scalar links only |
| Experiences | `experiences`; default `public` | Include | By visibility | Public only | Public only | Public only | UI-gated but complete client array serialized | Consent-controlled; nested DTO excludes IDs, context notes, achievements JSON, and timestamps |
| Education | `education`; default `public` | Include | By visibility | Public only | Public only | Public only | UI-gated but complete client array serialized | Consent-controlled; nested DTO excludes IDs, GPA, internal description, and relation keys |
| Skills | `skills`; default `public` | Include | By visibility | Public only | Public only | Public only | UI-gated but complete client array serialized | Consent-controlled; nested DTO excludes IDs and private context |
| Certifications | `certifications`; default `public` | Include | By visibility | Public only | Public only | Public only | UI-gated but complete client array serialized | Consent-controlled; nested DTO excludes credential ID, credential URL, and internal IDs |
| Languages | `languages`; default `public` | Include | By visibility | Public only | Public only | Public only | UI-gated but complete client array serialized | Consent-controlled; nested DTO excludes internal IDs |
| Opportunity preferences | Not consent-controlled | Omit | Omit | Omit | Omit | Omit | Broad serializer contains them, but current public-page mapping does not pass them | Never part of the public-profile DTO in Phase 1B |
| Verification indicators | Not consent-controlled | Include | Include | Include | Include | Include | Badge type and status serialized; evidence not queried | Intentionally public indicators only; emit verified type, never evidence, notes, verifier data, or badge IDs |
| Account identifiers | Not consent-controlled | Omit | Omit | Omit | Omit | Omit | Profile ID is passed to the Client Component although unused; Account relation is not queried | Keep the existing profile ID only as the route locator; never include it as a DTO property, and never include Account ID, account email, role, password hash, or session claims |
| Member-since date | Derived from `createdAt` | Include | Include | Include | Include | Include | Always serialized | Intentionally public derived date; no other timestamps |

- **Metadata and structured data**: The route has no `generateMetadata`, JSON-LD, or route-specific Open Graph output. It inherits static Laras metadata, which must remain profile-data-free.
- **API surface**: There is no unauthenticated public-profile JSON API. `/api/profile` and `/api/profile/privacy` are owner-session endpoints and are not public-profile serialization paths.
- **Cache decision**: Public-profile output is viewer-specific because it reads the session cookie. It must remain dynamically rendered and must not use `use cache`, `unstable_cache`, ISR, or `force-static`; no response may be shared across viewer classes.
- **Implementation boundary**: `src/lib/public-profile.ts` owns the single pure projection and DTO contract. `src/lib/public-profile.server.ts` applies Next.js' `server-only` guard, and the public route imports the projection only through that guarded boundary.
- **Query minimization**: The route selects only rendered profile scalars and narrow nested relation fields. It does not query Account data, verification evidence/notes/IDs, consent IDs/timestamps, nested relation IDs, admin/audit/license/moderation data, or private career context.
- **Client contract**: The Client Component receives the projected DTO plus a derived list of omitted field names for generic lock indicators. It receives no raw Prisma record, consent map, stored visibility value, relationship row, viewer account/profile ID, or session claim.

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

### A7b. Personal plan names: Free/Pro/Org vs FREE/PLUS/PRO/MAX
- **Current**: The codebase implements 3 plans: `free`, `pro`, `org`. The `PLAN_FEATURES` map and `PLAN_RANK` in `src/lib/entitlement.ts` use these 3 values.
- **Master prompt (§23)**: Mandates 4 personal plans: `FREE`, `PLUS`, `PRO`, `MAX`, plus separate workspace products: `INSTITUTION`, `ORGANIZATION`.
- **Discrepancy**: `org` in the codebase conflates the personal-tier concept with the workspace-product concept. `PLUS` and `MAX` tiers are entirely missing.
- **Question**: Should the codebase be migrated to the 4-plan model (FREE/PLUS/PRO/MAX) + 2 workspace products (INSTITUTION/ORGANIZATION)?
- **Impact**: Schema change to `License.plan` values; entitlement engine rewrite; settings UI update; admin license panel update.
- **Recommendation**: Migrate to the 4-plan + 2-workspace-product model in Phase 4 (Plans, Entitlements, Licenses, and Campaigns per §34 Round 4). The current 3-plan model is a prototype that must be corrected before production.

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

---

## Phase 1C — Durable Security Decisions

These decisions were established during the Phase 1C resource ownership authorization implementation and remediation (2026-07-11). They must not be casually reversed, weakened, or bypassed.

### D8. Actor identity derives from verified session plus current Account/Profile rows
- `requireActor()` reads the JWT session, loads the Account by ID (throwing UNAUTHORIZED if missing), and loads the UserProfile by accountId. No identity field (accountId, profileId, role, email) is ever trusted from request input (body, query, params, or headers).

### D9. Exact role normalization
- Only `user`, `admin`, and `owner` are recognized role strings. Any unknown or malformed role string (including `moderator`, `superadmin`, empty, null, undefined) is normalized to `user` scope. `requireCurrentAdmin` allows only `admin` or `owner`. There is no wildcard, prefix, or regex-based role matching.

### D10. Fail-closed unknown roles
- An account with an unrecognized role string receives ordinary user ownership scope for private resources and is denied from admin routes. Unknown roles never receive elevated access.

### D11. Admin/owner have no private ownership bypass
- `requireCurrentAdmin` grants access to admin-namespace routes (`/api/admin/*`) only. It does NOT grant access to another user's private documents, applications, interview sets, English sessions, certificates, or profile data through owner-scoped routes. Admin and owner can only access their own private resources through owner-scoped endpoints.

### D12. Foreign/missing private resources use equivalent responses
- A request for a resource owned by another user returns 404 `{ error: "not-found" }`. A request for a syntactically valid but nonexistent resource returns the same 404 response with the same body. The responses are indistinguishable in status code, exact JSON body, exact keys, content type, and cache headers. This prevents existence oracles.

### D13. Mutations use owner/relationship-scoped predicates or same-transaction revalidation
- All PATCH/DELETE operations use `updateMany`/`deleteMany` with `{ id, userProfileId }` in the where clause, or equivalent `$transaction`-based owner revalidation before write. No mutation performs an ID-only `update({ where: { id } })` or `delete({ where: { id } })` after a separate ownership check. "Check-then-act" is prohibited.

### D14. Connection transitions are participant/status scoped
- `requestConnection` uses `$transaction` with a full participant predicate `{ requesterId, addresseeId, status }` for re-request transitions. `acceptConnection` and `declineConnection` use `updateMany` with `{ id, addresseeId, status: "pending" }`. No connection transition uses an ID-only write.

### D15. Requester/addressee are never reassigned during transition
- When a declined connection is re-requested, only `status` and `message` are updated. `requesterId` and `addresseeId` are present in the where clause but never in the data clause. They are immutable for the lifetime of the connection row.

### D16. Authenticated sensitive JSON uses private/no-store
- All authenticated JSON responses that contain user data, resource data, or authorization decisions must include `Cache-Control: private, no-store`. This is enforced through the shared `safeNextResponse()` helper and the updated `handleAuthorizationError()`. Public certificate verification and unauthenticated error responses are exempt from this requirement.

### D17. Nested ownership follows complete parent chains
- Child resources (interview questions, application-document links, document versions, revision requests) authorize through their complete parent chain. The parent resource is verified against the actor's profileId before any child access. A child resource with a mismatched parent owner is indistinguishable from a missing resource.

### D18. Connection search has fixed input and result bounds
- `MIN_QUERY_LENGTH = 2`, `MAX_QUERY_LENGTH = 128`, `MAX_RESULTS = 20`. These are named constants in `src/lib/connections.ts`. Empty, whitespace-only, too-short, and too-long queries return empty results. The limit parameter is internally clamped: negative, zero, fractional, non-finite, and excessive values are clamped to safe defaults. Search never matches or returns private email, phone, consent settings, verification evidence, or raw profile data beyond the narrow projected DTO.

### D19. Accepted residual concurrency limitation
- SQLite's single-writer locking model means truly parallel mutation requests (e.g., simultaneous document revisions, simultaneous connection requests) serialize at the database layer. Version-stamp checks inside transactions provide correct serialization semantics. No distributed-lock or multi-writer guarantees are claimed. This limitation is documented and must be re-evaluated when migrating to a multi-writer database (Postgres, Turso).
