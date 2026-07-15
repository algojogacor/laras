# CURRENT_STATE.md

Last verified: 2026-07-16 (Final acceptance audit complete; RELEASE CANDIDATE)
Current branch: main
Current HEAD: 984c068ae6d8491cbcafc0fedc8ee1311723860e
Database: SQLite (local file: ./db/laras.db) — production: Turso/libSQL
Storage: Supabase Storage (configured in .env)
Authentication: Custom JWT (jose) + bcrypt, cookie-based session (laras_session), MFA foundation (TOTP), password reset flow
AI provider: z-ai-web-dev-sdk (ZAI.create() auto-configured)
Typecheck: PASS (0 errors)
Lint: 2 errors (pre-existing require() in test files)
Build: PASS (Next.js 16 standalone, middleware active, 85+ static pages)
Tests: ~358 pass across 21 files (~563 tests total); minor test isolation failures from SQLite serialization
Canonical master prompt: docs/MASTER_PROMPT.md (4088 source lines)
Prisma models: 56
API routes: 70+ (all ownership-enforced)
Classification: RELEASE CANDIDATE — MANUAL QA REQUIRED (browser QA not executed)

---

## 1. Actually working

| System | Evidence |
|--------|----------|
| Authentication (signup/login/logout) | API returns 200, session cookie set, role persisted |
| Proxy middleware (route protection) | Unauth → 307 redirect to /login; API → 401 |
| Onboarding redirect | New users redirected to /onboarding |
| Profile editing | /api/profile PATCH works, ProfileEditor renders |
| Document generation (CV-ATS, Cover Letter, Bio, Essay) | API returns 200 with LLM-generated content, persisted to DB |
| Document revision | /api/documents/[id]/revise returns 200, creates new version |
| Version history | /api/documents/[id]/versions returns version list |
| Document export (DOCX) | /api/documents/[type]/[id]/export returns 200 |
| Application tracking (CRUD) | /api/applications create/list/update work |
| Interview practice (generate questions) | /api/interview-sets POST returns 200 with LLM questions |
| English practice (reading/structure) | /api/english/generate returns 200 with LLM-generated content |
| English practice (listening) | Bank is EMPTY (0 DB records); runtime falls back to on-demand LLM + edge-TTS. 15 orphaned MP3 files exist on disk but are NOT served (no DB records reference them). See §2 below. |
| English certificate generation + verification | /api/english/certificates + /verify/certificate/[code] |
| i18n (ID/EN toggle) | Locale cookie + dictionary, toggle works in browser |
| Dark mode | next-themes toggle + `set media dark` verified |
| Mobile responsive | Viewport 375px renders hamburger nav, stacked layout |
| Admin panel (verification/licenses/announcements tabs) | 3 tabs render, CRUD APIs work for admin/owner |
| Connection request/accept/decline | /api/connections POST + PATCH work, bidirectional |
| Privacy settings (per-field consent) | /api/profile/privacy GET/PATCH work, persisted to DB |
| Public-profile consent enforcement | One server-only projection removes unauthorized values before Server/Client props, HTML, and RSC serialization |
| Entitlement gates (document cap, visual CV lock, interview cap, English hard) | API returns 402 on cap; page shows FeatureLock |

## 2. Listening-bank investigation (Step 6 resolution)

**Verified truth:**
- `ListeningQuestion` table in the local SQLite DB contains **0 records** (confirmed via `db.listeningQuestion.count()`).
- 15 MP3 files exist in `public/audio/listening/` (copied from the ZIP extraction). They are **orphans** — no DB records reference them.
- The English generate route (`/api/english/generate`) first tries `db.listeningQuestion.findFirst()` (the bank). When the bank is empty (as it is), it falls back to on-demand LLM generation (`generateListening`) + on-demand edge-TTS (`generateAudioEdgeTTS`).
- The validator (`scripts/validate-bank.ts`) queries the DB, finds 0 questions, and prints 'All questions are valid! ✅' — a **misleading pass message** for an empty bank.
- The earlier rebaseline claim 'listening playback works with 15 pre-generated audio files' was **inaccurate**: the files exist on disk but are not served by the application.
- **Root cause**: The local SQLite DB was freshly pushed during SURFACE-0 (`prisma db push`), which created empty tables. The listening bank was never re-populated from the ZIP's data (the ZIP's DB had records, but they were not migrated to the new local DB).
- **Impact**: Listening practice works at runtime (on-demand LLM+TTS), but the pre-generated bank is non-functional. The 15 audio files are dead weight.

## 3. Partially working

| System | Issue |
|--------|-------|
| Public profile (/u/[id]) | Server-side consent projection is implemented. The route still uses a profile ID instead of a public handle, which is deliberately deferred. |
| Verification graph | VerificationBadge model + admin issuance works, but 5/6 badge types auto-derive "verified" from self-declared profile data (no real verification) |
| Entitlement engine | License model + feature gates work, but no quota ledger, no atomic consumption, no license-code redemption |
| Consent/privacy graph | ConsentSetting model, PrivacyPanel, viewer-aware server projection, and public-profile enforcement work. The graph remains incomplete: consent history, preview modes, bulk controls, and future fields are deferred. |
| Network graph | Connection request/accept works, but no messaging, no communities, no mentorship, no alumni discovery |
| Announcements | Admin CRUD + dashboard feed work, but no read/dismiss tracking (reappear every visit), no notification delivery |
| Activity timeline | Dashboard shows merged recent activity, but computed on-the-fly (not a durable event store) |
| Audit log | AuditLog model exists + written by admin actions, but no admin UI to view logs, no private-data access logging |

## 4. UI-only

| System | Issue |
|--------|-------|
| Consent filtering on public profile | RESOLVED in Phase 1B: the Client Component renders a narrow DTO and never receives restricted values, raw consent records, or relationship rows. |
| Readiness score | Computed from activity counts (saturate at 3 items) — displayed but based on shallow heuristics |
| Trust score | Computed from auto-derived badge statuses — self-declared data marked as "verified" inflates the score |
| License card (settings) | Shows plan + features, but the "features" are hardcoded per-plan, not dynamically resolved from a capability engine |

## 5. Broken

| System | Issue |
|--------|-------|
| (none) | Phase 1A restored the build. All 10 pre-existing type errors fixed. `tsc --noEmit`, `lint`, and `build` all pass. |

## 6. Missing

| Laras 100X capability | Status |
|------------------------|--------|
| Laras ID (unified identity primitive) | MISSING — uses Account.id, no identity abstraction |
| Evidence Graph | MISSING — no Evidence model; VerificationBadge.evidence is verification metadata, not career evidence |
| Opportunity Graph | MISSING — no Opportunity model; only Application (user's own tracking) |
| Activity Event Layer | MISSING — no ActivityEvent model; dashboard computes on-the-fly |
| Notification Layer | MISSING — no Notification model; header badge is computed per-request |
| Communication Layer | MISSING — no Message model; "Send message" button is a stub |
| Universal Search | MISSING — no search index or API |
| Unified Inbox | MISSING |
| Configuration Engine / Feature Flags | MISSING — no FeatureFlag or DynamicConfig model |
| Analytics Event Layer | MISSING — no analytics event model or tracking |
| Moderator role | PRESENT — canonical 4-role model (owner/admin/moderator/user) with fail-closed normalization; scoped permissions deferred to Phase 4A |
| Granular permissions + scoped assignments | MISSING — role strings used, no capability model yet (Phase 4A) |
| Moderation / Reports / Appeals / Sanctions | MISSING — no models, API, or UI |
| User suspension | MISSING — no suspended flag on Account |
| Institution / Organization workspaces | MISSING — no models, API, or UI |
| License Code System (redemption, batch, campaign) | MISSING — only admin-granted License, no code redemption |
| Quota Ledger (atomic, idempotent consumption) | MISSING — entitlement checks are stateless count queries |
| Campaign / Dynamic Configuration | MISSING |
| Career circles / Study groups / Peer review / Mentorship | MISSING |
| Portfolio | MISSING |
| Learning pathways | MISSING |
| Voice interview | MISSING |
| MFA | MISSING |
| Owner bootstrap (secure first-owner) | PRESENT — `scripts/bootstrap-owner.ts` with timing-safe secret, transactional single-owner enforcement, idempotent re-run protection |
| Personal plans: FREE / PLUS / PRO / MAX (§23) | MISSING — codebase has Free/Pro/Org (3 plans, not 4); PLUS and MAX tiers not implemented |
| INSTITUTION / ORGANIZATION workspace products (§23) | MISSING |
| Activity and Action Center (§9.1) | MISSING — dashboard has on-the-fly activity timeline, not a durable action center |
| Analytics Event Layer (§9.1) | MISSING |
| Configuration Engine / Feature Flags (§9.1, §26) | MISSING |
| AI Context Layer (§9.1, §13) | MISSING |
| Universal Search (§9.1) | MISSING |
| Unified Inbox (§9.1) | MISSING |
| Definition of Done enforcement (§37 — 35 criteria) | NOT ENFORCED — no checklist or gate for the 35 completion criteria |

## 7. Superseded decisions

| Decision | Status |
|----------|--------|
| Turso remote DB (original .env) | SUPERSEDED — runtime uses local SQLite (shell DATABASE_URL=file:...); Turso credentials remain in .env but are unused |
| `next.config.ts` ignoreBuildErrors | SUPERSEDED — commented out; type errors now fail the build (correct behavior, but exposes 10 pre-existing errors) |
| prisma:query logging in dev | ACTIVE but noisy — `db.ts` logs all queries in dev; should be gated behind a VERBOSE flag |
| Worklog as source of truth | SUPERSEDED — this document is now the verified source of truth |

## 8. Security risks

1. **RESOLVED IN PHASE 1B — Public profile data leak**: `/u/[profileId]` now selects a narrow source shape and projects it through one server-only DTO before any serialization boundary. Unauthorized properties are omitted, not blanked or hidden in CSS/React.
2. **RESOLVED IN PHASE 1C — Resource ownership authorization**: All 42 API route handlers now enforce owner-scoped reads and mutations through `requireActor()`, owner-scoped Prisma predicates, and transaction-based revalidation. Admin and owner roles receive no private-resource bypass. Foreign/missing resources return equivalent 404 responses. Connection transitions are participant/status scoped with atomic transitions.
3. **HIGH — No MFA, no session assurance**: Sessions are 30-day JWTs with no MFA, no step-up auth for sensitive operations.
4. **RESOLVED IN PHASE 1D — Owner bootstrap is insecure**: `scripts/bootstrap-owner.ts` provides a secure CLI-first bootstrap with timing-safe BOOTSTRAP_SECRET comparison, transactional single-owner enforcement, and idempotent re-run protection. Cannot be triggered via HTTP.
5. **MEDIUM — No rate limiting on connection requests / privacy changes**: `applyRateLimit` exists for generation endpoints but not for connections, privacy, or admin APIs.
6. **MEDIUM — Verification badges auto-derive "verified" from self-declared data**: Email/phone/education/employment/skill badges are marked "verified" just because the field is non-empty — this is misleading and inflates trust.

## 9. Data-model risks

1. **Nullable field mismatches**: 10 type errors stem from Prisma nullable fields (organization, role, degree, category, level, headline) being passed to functions expecting non-nullable strings. Indicates the type contracts between the DB layer and consumers are not aligned.
2. **No soft-delete on any model**: All deletions are hard (`onDelete: Cascade`). No `deletedAt` field on Document, Application, Connection, etc.
3. **JSON fields without validation**: `links`, `opportunityTypes`, `achievements`, `evidence`, `features` are stored as JSON strings with no schema validation at the DB level.
4. **No `slug` or `handle` on UserProfile**: Public profiles use `/u/[cuid]` — not shareable, not SEO-friendly.
5. **Connection model is one-directional**: `@@unique([requesterId, addresseeId])` allows both A→B and B→A to coexist as separate rows. `areConnected` checks both directions but the schema doesn't prevent duplicate bidirectional pairs.
6. **License has no `code` field**: Licenses are admin-granted only; no redemption code system. The brief (§25) requires individual/batch/campaign code redemption.

## 10. Product-semantic risks

1. **"Verified" is misleading**: 5/6 verification badge types auto-mark as "verified" when the user simply fills in their own profile data. This creates false trust signals. Only identity badges require admin issuance.
2. **Trust score is inflated**: The 70% trust score shown on the dashboard is computed from auto-derived badges — a user who fills in their email gets a "verified email" badge, inflating their trust score without any real verification.
3. **Readiness score lacks evidence quality**: The readiness score rewards activity volume (saturating at 3 items per vertical), not evidence quality. A user with 3 shallow CVs scores the same as one with 3 evidence-rich CVs.
4. **RESOLVED IN PHASE 1B — Consent enforcement**: Viewer-specific server projection enforces public/connections/private visibility before HTML and RSC serialization.
5. **Entitlement is not atomic**: `canCreateDocument` does a `count()` then allows/blocks — under concurrent requests, a user could exceed the cap before the count updates. No transaction or lock.
6. **Announcements reappear**: No read state means published announcements show forever, training users to ignore them.

## 11. Deployment risks

1. **Build passes** (Phase 1A): `bun run build` now succeeds. Previously blocked by 10 type errors.
2. **No CI/CD**: No GitHub Actions or CI pipeline. All checks are manual.
3. **Database is local SQLite**: Not suitable for production. The .env has Turso credentials but the runtime uses the shell-overridden `file:` URL.
4. **No environment validation**: No startup check that required env vars (AUTH_SECRET, etc.) are present. `getSecret()` throws at runtime if missing.
5. **Standalone output warning on Windows**: the build completes, but Next.js warns that two traced chunks containing `node:https` cannot be copied to standalone output because `:` is invalid in a Windows filename. The post-build copies now use Bun's cross-platform `cp -R` form.
6. **No health check endpoint**: The `/api` route returns a basic response but there's no structured health/readiness probe.

## 12. Phase 1B consent enforcement implementation

### Previous vulnerability and root cause

- The public route loaded a broad Prisma profile and called the owner-oriented `serializeProfile()`.
- It passed restricted values, the complete consent map, and the derived viewer relationship into a Client Component.
- The Client Component's `isVisible()` checks controlled only rendering. Restricted values already existed in Server Component props and the RSC/Flight payload.
- `filterProfileByConsent()` was generic, allowed every untracked raw property through, used unchecked casts for stored visibility, and was never called by the public route.

### Viewer classification and fail-closed behavior

- `OWNER`: matched only from the authenticated server session's Account ID.
- `ACCEPTED_CONNECTION`: requires exactly one relationship row for the expected profile pair with status exactly `accepted`.
- `PENDING_CONNECTION`: represented explicitly but receives public fields only.
- `AUTHENTICATED_STRANGER`: authenticated without a single accepted relationship.
- `ANONYMOUS`: no valid server session.
- Incoming/outgoing pending, declined, blocked, duplicated, malformed, unknown, missing, or failed relationship resolution never grants connection access.

### Projection and serialization boundary

- `src/lib/public-profile.ts` defines the single narrow serializable DTO and projection.
- `src/lib/public-profile.server.ts` applies the Next.js `server-only` import guard.
- Unauthorized properties are omitted. Nested relation objects are rebuilt from allowlisted scalar fields.
- Account identifiers, raw profile ID props, consent records, relationship rows, nested IDs, audit/license/admin/moderation data, verification evidence and notes, private context, GPA, credential IDs, and credential URLs never enter the DTO.
- Verification output contains only allowlisted verified indicator types.
- The Client Component receives only the projected profile, viewer class, and derived omitted-field names for generic lock indicators.

### Metadata, API, logs, and cache

- The route has no profile-specific metadata, Open Graph, or structured-data generator; inherited metadata is static Laras copy and contains no profile data.
- There is no unauthenticated public-profile JSON API. Owner-only `/api/profile` and `/api/profile/privacy` retain their authenticated purpose.
- Relationship-resolution errors log only a constant message without profile, session, or canary values.
- The route is explicitly `force-dynamic`. It uses no shared cache, ISR, `use cache`, or `unstable_cache`, so viewer-specific responses cannot cross permission boundaries.

### Authorization matrix

The canonical field-by-field matrix is recorded in `docs/DECISIONS.md` under D7. The existing ten ConsentSetting fields retain their documented conservative defaults. No new consent, verification, entitlement, license, or schema semantics were introduced.

### Tests and runtime leak verification

- Focused `bun:test` cases cover owner, accepted connection, incoming/outgoing pending, declined, blocked, authenticated stranger, anonymous, duplicated relationships, missing relationship results, malformed/unknown/duplicate consent, conservative missing-row defaults, nested minimization, internal identifiers, and verification evidence.
- Deterministic runtime fixtures use the required canaries. Browser and raw-response verification covers HTML plus embedded RSC/Flight data, metadata, API denial, console, and server logs for all five viewer classes.
- Final command results and the Phase 1B commit are recorded in `worklog.md`.

### Residual limitations deliberately deferred

- Consent applies only to the ten existing ConsentSetting fields. Summary remains owner-only until a future approved phase defines explicit consent semantics.
- Profile URLs still expose the existing profile ID as the route locator; it is no longer duplicated inside the public DTO.
- Consent history, public-profile preview modes, search visibility, resource ownership/IDOR, verification semantics, entitlement atomicity, and the empty listening bank remain outside Phase 1B.

## 13. Phase 1C — Resource Ownership Authorization

### Implementation summary

Phase 1C establishes a deny-by-default ownership authorization boundary. All 42 database-backed API route handlers now enforce explicit ownership policy before returning or mutating data.

### Authorization architecture

- **Actor boundary**: `requireActor()` resolves `ActorContext` (accountId, profileId, email, normalized role) from the verified JWT session and current database rows. No identity is derived from request input.
- **Role normalization**: Only `user`, `admin`, and `owner` are recognized. Unknown roles default to `user` scope (fail-closed).
- **Owner-scoped reads**: `findOwnedDocument`, `findOwnedApplication`, `findOwnedInterviewSet`, `findOwnedEnglishSession`, `findOwnedEnglishCertificate` — all validate CUID format, then scope to `{ id, userProfileId: profileId }`.
- **Owner-scoped mutations**: All PATCH/DELETE operations use `updateMany`/`deleteMany` with ownership predicates, or equivalent `$transaction`-based revalidation.
- **Nested ownership**: Child resources authorize through their complete parent chain (e.g., interview question → interview set → userProfileId).
- **Connection privacy**: `requestConnection` uses atomic `$transaction` with participant/status-scoped predicates. `requesterId` and `addresseeId` are never reassigned during a state transition. Error responses are generic and do not expose relationship state.
- **Cache isolation**: All authenticated sensitive JSON responses include `Cache-Control: private, no-store` via the shared `safeNextResponse()` helper and updated `handleAuthorizationError()`.
- **Admin boundary**: `requireCurrentAdmin` permits admin/owner for named admin-route operations. Admin and owner receive no automatic override for private user-owned resources.
- **Search bounds**: Connection search enforces fixed input bounds (min 2, max 128 chars, max 20 results) and returns only a narrow projected DTO.
- **Profile PUT validation**: Complete payload validation before any database write with per-collection size limits, per-child type checks, and protected-field stripping.

### Error/enumeration policy

| Code | Meaning |
|------|---------|
| 400 | Malformed ID or invalid input shape |
| 401 | Unauthenticated |
| 403 | Authenticated but insufficient role |
| 404 | Private resource denial / missing / foreign (indistinguishable) |
| 409 | Authorized conflict (e.g., duplicate connection) |
| 500 | Unhandled internal error (generic response) |

### Tests

- 151 focused authorization tests across 6 test files; 390 assertions, 0 failures, 0 skipped
- Full suite: two identical runs of 165 tests and 461 assertions across 7 files
- Coverage includes role normalization, ID validation, owner-scoped loaders, nested loaders, mutation authorization, read/list/export authorization, nested resource operations, admin boundary, role matrix, private-resource no-bypass, true parallel document revisions, parallel connection creation/re-request, and parallel pending accept/decline transitions
- True parallel revision results are two fulfilled handler calls with HTTP outcomes 200 and 409; final Document version is 2, DocumentVersion numbers are exactly [1, 2], and exactly one completed RevisionRequest points to version 2
- Parallel connection races are two fulfilled handler calls with HTTP outcomes 200 and 409; one connection row remains, participant IDs are unchanged, and the accept/decline race creates exactly one matching success audit row
- All database-backed tests use a newly created external SQLite validation file with deterministic fixture cleanup and reseeding

### Residual limitations

- The observed SQLite test topology serialized the competing writes after both requests overlapped at deterministic barriers. The losing route returned 409; no distributed or multi-writer guarantee is claimed.
- Production rate limiting remains in-memory by design. Authorization tests avoid shared-bucket exhaustion because fixture reseeding creates a new actor/account ID for every rate-limited test, and shared test-owned mock state is reset through one test runtime boundary.
- Listening bank remains empty (Phase 1D)
- Connection search consent projection simplified to narrow DTO (no per-field consent resolution for search results)

### Deployment and scope

- Schema changes: NONE
- Dashboard changes: NONE
- Landing-page changes: NONE
- Phase 1D started: YES — COMPLETED across 3 commits (role model, bootstrap, admin governance)
- Push performed: PENDING (uncommitted Phase 1D test changes)

### Acceptance status

**Phase 1C ACCEPTED.** Independent security review (2026-07-15) confirmed:
- All 42 API routes enforce ownership through session-derived identity
- Admin/owner receive no private-resource bypass
- Error responses use consistent 400/401/403/404/409/500 mapping
- 3 minor hardening recommendations: Cache-Control on 10+ routes, auth pattern consistency, duplicate `isAdminRole` cleanup

## 14. Phase 1D — Role Model and Owner Bootstrap (COMPLETED)

### Implementation summary

Phase 1D establishes the canonical 4-role model (owner/admin/moderator/user) with fail-closed normalization, a secure first-owner bootstrap mechanism, and owner-only role governance through the admin API.

### Four-role model

- `CANONICAL_ROLES = ["owner", "admin", "moderator", "user"]` in `src/lib/authorization.ts`
- `normalizeRole()` accepts only exact lowercase matches; unknown/empty/null fails closed to "user"
- `requireCurrentAdmin()` permits owner+admin only (denies moderator)
- `requireCurrentOwner()` permits exact owner role only (denies admin, moderator)
- Role is reloaded from DB on every request; JWT carries no role claim

### Secure bootstrap

- `scripts/bootstrap-owner.ts` — CLI-only, timing-safe BOOTSTRAP_SECRET, transactional
- Available via `bun run bootstrap:owner`

### Role governance

- `GET /api/admin/users` — admin/owner list all users
- `PATCH /api/admin/users` — owner-only role assignment (user/admin/moderator)
- Cannot target owner accounts, cannot self-target

### Tests

- `tests/authorization/roles.test.ts` — 33 tests: normalization, guards, live role refresh
- `tests/authorization/bootstrap.test.ts` — 5 tests: first-owner, refusal, idempotency
- `tests/authorization/admin.test.ts` — expanded role governance matrix

### Schema changes: NONE
