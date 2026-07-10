# CURRENT_STATE.md

Last verified: 2026-07-11 (Phase 1A complete)
Current branch: main
Current commit: (pending — Phase 1A commit)
Database: SQLite (local file: /home/z/my-project/db/custom.db)
Storage: Supabase Storage (configured in .env, used for file uploads)
Authentication: Custom JWT (jose) + bcrypt, cookie-based session (laras_session)
AI provider: z-ai-web-dev-sdk (ZAI.create() auto-configured, no explicit key)
Typecheck: PASS (0 errors) — fixed in Phase 1A
Lint: PASS
Build: PASS — fixed in Phase 1A
Browser QA: PASS (touched surfaces: dashboard, public profile, connections, privacy — all render correctly on desktop + mobile + ID/EN)
Tests: NONE (no test files, no test framework; listening bank validator reports '0 valid, 0 invalid out of 0 total' — bank is empty, not actually validated)
Canonical master prompt: docs/MASTER_PROMPT.md (4088 source lines, SHA-256 64948d6e...)

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
| Public profile (/u/[id]) | Renders, resolves viewer relationship, BUT consent filtering is UI-only — full data leaks in RSC payload (see §5) |
| Verification graph | VerificationBadge model + admin issuance works, but 5/6 badge types auto-derive "verified" from self-declared profile data (no real verification) |
| Entitlement engine | License model + feature gates work, but no quota ledger, no atomic consumption, no license-code redemption |
| Consent/privacy graph | ConsentSetting model + PrivacyPanel UI work, but `filterProfileByConsent` is defined and NEVER USED — enforcement is client-side only |
| Network graph | Connection request/accept works, but no messaging, no communities, no mentorship, no alumni discovery |
| Announcements | Admin CRUD + dashboard feed work, but no read/dismiss tracking (reappear every visit), no notification delivery |
| Activity timeline | Dashboard shows merged recent activity, but computed on-the-fly (not a durable event store) |
| Audit log | AuditLog model exists + written by admin actions, but no admin UI to view logs, no private-data access logging |

## 4. UI-only

| System | Issue |
|--------|-------|
| Consent filtering on public profile | The client component conditionally renders fields based on consent, but the server passes the full unredacted profile in RSC payload — a public viewer can read hidden emails/phones in page source |
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
| Moderator role + scoped permissions | MISSING — only user/admin/owner; no MODERATOR, no permission model |
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
| Owner bootstrap (secure first-owner) | MISSING — roles set via DB/script, no secure bootstrap |
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

1. **CRITICAL — Public profile data leak**: The `/u/[profileId]` page passes the full unredacted profile (including email, phone) to the client component as RSC props. A public viewer can read "connections"-only and "private" fields in the page source. `filterProfileByConsent` exists but is never called server-side.
2. **HIGH — No server-side authorization for non-admin APIs**: Most APIs check only `getSession()` (authenticated), not ownership or relationship. E.g., `/api/documents/[id]` doesn't verify the document belongs to the caller; `/api/connections/[id]` PATCH checks addressee but other resource APIs may not check ownership.
3. **HIGH — No MFA, no session assurance**: Sessions are 30-day JWTs with no MFA, no step-up auth for sensitive operations.
4. **MEDIUM — Owner bootstrap is insecure**: The owner role is set via DB script (`bun -e "db.account.update..."`), not a secure bootstrap mechanism. Anyone with DB access can self-promote.
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
4. **Consent is not enforced**: Users set privacy levels expecting them to be enforced, but a public viewer can see all data in the page source. This is a false sense of privacy.
5. **Entitlement is not atomic**: `canCreateDocument` does a `count()` then allows/blocks — under concurrent requests, a user could exceed the cap before the count updates. No transaction or lock.
6. **Announcements reappear**: No read state means published announcements show forever, training users to ignore them.

## 11. Deployment risks

1. **Build passes** (Phase 1A): `bun run build` now succeeds. Previously blocked by 10 type errors.
2. **No CI/CD**: No GitHub Actions or CI pipeline. All checks are manual.
3. **Database is local SQLite**: Not suitable for production. The .env has Turso credentials but the runtime uses the shell-overridden `file:` URL.
4. **No environment validation**: No startup check that required env vars (AUTH_SECRET, etc.) are present. `getSecret()` throws at runtime if missing.
5. **Standalone output mode**: `next.config.ts` has `output: "standalone"` but the build script's `cp -r` commands assume a specific directory structure that may break.
6. **No health check endpoint**: The `/api` route returns a basic response but there's no structured health/readiness probe.
