# PHASE_PLAN.md

The remaining Laras 100X transformation, broken into small, dependency-first phases. Each phase is independently shippable and testable. Do NOT begin any phase until the product owner has reviewed this plan.

**Canonical reference:** `docs/MASTER_PROMPT.md` §34 (Suggested Ten-Round Execution Map) and §37 (Definition of Done — 35 criteria).

**Phase-to-round mapping:** The phases below are granular sub-phases within the brief's ten-round structure. The brief's §34 round ordering is authoritative; deviations require owner approval. The current codebase has completed informal "rounds" (SURFACE-0 through ROUND-10) that partially overlap with the brief's Round 1 (baseline) and Round 2 (identity/career/privacy), but did not follow the brief's structure and skipped critical foundations.

**Definition of Done (§37):** Every phase must satisfy all 35 criteria before being marked complete. A database model, route, button, or placeholder page alone is not a complete feature (§37 explicit warning).

---

## Phase 1A — Type-safety restoration and build-green baseline

**Objective**: Restore a passing `tsc --noEmit` and `bun run build` so all future work has a reliable CI gate.

**Included scope**: Fix the 10 pre-existing TypeScript errors (nullable field mismatches in dashboard timeline, public profile, connections panel, privacy panel, connections lib).

**Excluded scope**: No new features, no schema changes, no styling.

**Schema changes**: None.

**Service changes**: Align type signatures in `src/lib/readiness.ts` (buildActivityTimeline accepts nullable org/role), `src/lib/connections.ts` (searchUsers return type), `src/lib/privacy.ts` (ConsentEntry type fix).

**API changes**: None.

**UI changes**: None (type-only fixes).

**Authorization requirements**: None.

**Tests**: `bunx tsc --noEmit` exits 0; `bun run build` exits 0.

**Browser QA**: Verify dashboard, public profile, connections, privacy panel still render identically.

**Acceptance criteria**: 0 type errors; build passes; dev server unaffected.

**Rollback considerations**: Pure type-alignments; if a fix changes runtime behavior, revert that specific commit.

**Stop condition**: Build is green. Do not proceed to add features.

---

## Phase 1B — Server-side consent enforcement

**Objective**: Fix the critical public-profile data leak. Consent must be enforced server-side, not just in client rendering.

**Included scope**: Call `filterProfileByConsent` in the `/u/[profileId]` page server component BEFORE passing data to the client. Remove hidden fields from the RSC payload entirely.

**Excluded scope**: No new consent fields; no changes to the PrivacyPanel UI.

**Schema changes**: None.

**Service changes**: `src/app/u/[profileId]/page.tsx` filters the serialized profile through `filterProfileByConsent` using the viewer's relationship before passing to `PublicProfileView`.

**API changes**: None.

**UI changes**: `PublicProfileView` no longer needs consent-gating logic (server sends only visible fields); simplify to render-or-hide based on field presence.

**Authorization requirements**: Viewer relationship resolution (owner/connection/public) must happen server-side (already does).

**Tests**: Fetch `/u/[id]` as public viewer; assert email/phone NOT in HTML source (not just not rendered).

**Browser QA**: Public viewer sees lock indicators, not field values, in page source. Connection viewer sees connections-level fields. Owner sees all.

**Acceptance criteria**: `curl -s /u/[id] | grep "qa@laras.test"` returns nothing for a public viewer (when email consent = connections).

**Rollback considerations**: If filtering breaks the component, revert to passing full data + re-add client gating (but this re-introduces the leak — prefer fix).

**Stop condition**: Public viewer cannot access hidden field values in any part of the HTTP response.

---

## Phase 1C — Ownership authorization on all resource APIs

**Objective**: Prevent any authenticated user from accessing another user's resources via API.

**Included scope**: Audit all `/api/[resource]/[id]` routes. Add ownership checks (`resource.userProfileId === profile.id`) to: documents, applications, interview sets, english sessions, english certificates.

**Excluded scope**: No changes to admin APIs (they already check `isAdminRole`).

**Schema changes**: None.

**Service changes**: Add a shared `requireOwnership(profileId, session)` helper in `src/lib/auth.ts`.

**API changes**: Each resource API returns 403 if the resource doesn't belong to the caller (and caller isn't admin).

**UI changes**: None.

**Authorization requirements**: Ownership + admin override.

**Tests**: User A cannot GET/PATCH/DELETE User B's document/application/interview.

**Browser QA**: Existing user flows unaffected; cross-user access returns 403.

**Acceptance criteria**: No resource API returns another user's data to a non-admin.

**Rollback considerations**: If an ownership check breaks a legitimate shared-resource flow, document it and scope the exception.

**Stop condition**: All resource APIs enforce ownership.

---

## Phase 1D — Role model and owner bootstrap

**Objective**: Establish the 4-role model (OWNER/ADMIN/MODERATOR/USER) and a secure first-owner bootstrap mechanism.

**Included scope**: Add MODERATOR role to `Account.role`. Create a CLI bootstrap script (`scripts/bootstrap-owner.ts`) that creates the first owner from env config. Document the process.

**Excluded scope**: No permission model yet (Phase 4A). No moderator scoping yet.

**Schema changes**: None (role is already a String; "moderator" is a new value).

**Service changes**: `src/lib/auth.ts` — add `hasPermission()` stub. `scripts/bootstrap-owner.ts` — secure first-owner creation.

**API changes**: None.

**UI changes**: None.

**Authorization requirements**: Owner bootstrap via CLI/env only, never via API/registration.

**Tests**: Bootstrap script creates exactly one owner; re-running is idempotent.

**Browser QA**: Existing admin/owner flows unaffected.

**Acceptance criteria**: `bun run scripts/bootstrap-owner.ts` creates the first owner; MODERATOR role is accepted by `isAdminRole` (or a new `hasRole` helper); normal registration cannot create admin/owner/moderator.

**Rollback considerations**: Bootstrap script is additive; no rollback needed.

**Stop condition**: First-owner bootstrap works; role model accepts 4 values.

---

## Phase 2A — Evidence Graph foundation

**Objective**: Add structured evidence (project names, metrics, proof artifacts) linked to experiences and skills, with provenance and verification status.

**Included scope**: `Evidence` Prisma model (type, summary, detail, provenance, verificationStatus, linkedTo experience/skill/achievement). UI to attach evidence in the ProfileEditor. Evidence surfaces on public profile (consent-gated).

**Excluded scope**: No automated verification (that's a later phase). No evidence-based scoring yet.

**Schema changes**: New `Evidence` model with relations to UserProfile + optional Experience/Skill/Achievement.

**Service changes**: `src/lib/evidence.ts` — CRUD + serialization.

**API changes**: `/api/profile/evidence` (GET/POST/PATCH/DELETE).

**UI changes**: Evidence section in ProfileEditor; evidence chips on public profile.

**Authorization requirements**: Owner-only edit; consent-gated view.

**Tests**: Evidence CRUD; consent filtering on public profile.

**Browser QA**: Add evidence to an experience; verify it shows on own profile; verify consent filtering on public profile.

**Acceptance criteria**: Evidence model exists; users can attach structured evidence; evidence has provenance field (not auto-verified); public profile respects consent for evidence.

**Rollback considerations**: New model — low risk. If schema push fails, remove model.

**Stop condition**: Evidence can be created, viewed, consent-filtered.

---

## Phase 2B — Activity Event Layer

**Objective**: Replace on-the-fly activity computation with a durable, append-only ActivityEvent store.

**Included scope**: `ActivityEvent` Prisma model. Emit events on document/application/interview/english creation. Dashboard timeline reads from events.

**Excluded scope**: No event sourcing rebuild. No analytics aggregation yet.

**Schema changes**: New `ActivityEvent` model (type, actorId, resourceType, resourceId, metadata, createdAt).

**Service changes**: `src/lib/activity.ts` — `emitEvent()` helper. Update existing creation endpoints to emit events.

**API changes**: None (events are read server-side, not via API).

**UI changes**: Dashboard `ActivityTimeline` reads from events instead of on-the-fly merge.

**Authorization requirements**: Owner-only (events are private to the actor).

**Tests**: Creating a document emits an event; dashboard shows the event.

**Browser QA**: Dashboard timeline shows events in chronological order.

**Acceptance criteria**: ActivityEvent model; events emitted on all creation actions; dashboard reads from event store.

**Rollback considerations**: Keep the on-the-fly computation as fallback during migration.

**Stop condition**: Dashboard timeline reads from ActivityEvent store.

---

## Phase 2C — Notification Layer

**Objective**: Durable notification store with read state, replacing per-request count queries.

**Included scope**: `Notification` Prisma model (type, recipientId, metadata, readAt, createdAt). Connection requests create notifications. Header badge reads from store. Mark-as-read API.

**Excluded scope**: No real-time push (SSE/WebSocket) yet. No email delivery.

**Schema changes**: New `Notification` model.

**Service changes**: `src/lib/notifications.ts` — `createNotification()`, `getUnreadCount()`, `markAsRead()`.

**API changes**: `/api/notifications` (GET list), `/api/notifications/[id]/read` (PATCH).

**UI changes**: Header badge reads from store; notification dropdown/page.

**Authorization requirements**: Recipient-only.

**Tests**: Connection request creates notification; unread count increments; mark-as-read works.

**Browser QA**: Send connection request; recipient sees badge; click to mark read.

**Acceptance criteria**: Notification model; connection requests create notifications; badge reflects unread count; mark-as-read persists.

**Rollback considerations**: New model — low risk.

**Stop condition**: Notifications are stored, counted, and dismissible.

---

## Phase 3A — Opportunity Graph

**Objective**: Add the Opportunity model with requirement extraction and match explanation.

**Included scope**: `Opportunity` Prisma model (type, title, organization, requirements, deadline, source). Requirement extraction from pasted JDs (LLM). Match explanation against Career Graph. Gap analysis.

**Excluded scope**: No opportunity discovery feed yet. No external opportunity scraping.

**Schema changes**: New `Opportunity` model. Link `Application` to `Opportunity` (optional).

**Service changes**: `src/lib/opportunities.ts` — CRUD + requirement extraction + match.

**API changes**: `/api/opportunities` (CRUD), `/api/opportunities/[id]/match` (gap analysis).

**UI changes**: Opportunities page; save opportunity; match view.

**Authorization requirements**: Owner-only for creating; consent-gated for viewing.

**Tests**: Create opportunity; extract requirements; run match; verify gap output.

**Browser QA**: Save an opportunity; view match explanation.

**Acceptance criteria**: Opportunity model; requirement extraction works; match explanation shows gaps vs profile.

**Rollback considerations**: New model — low risk. Link to Application is optional.

**Stop condition**: Opportunities can be created, matched, and tracked.

---

## Phase 3C — Quota Ledger

**Objective**: Replace stateless count-based entitlement checks with an atomic, idempotent QuotaLedger.

**Included scope**: `QuotaLedger` Prisma model (userId, capability, consumedAt, amount, idempotencyKey, refundedAt). Update `canCreateDocument` / `canCreateInterviewSet` to use the ledger. Refund on failure.

**Excluded scope**: No license-code consumption yet (Phase 5A).

**Schema changes**: New `QuotaLedger` model.

**Service changes**: `src/lib/entitlement.ts` — atomic `consumeQuota()` with idempotency key.

**API changes**: Generation endpoints call `consumeQuota` before LLM call; refund on failure.

**UI changes**: None.

**Authorization requirements**: Owner-only consumption.

**Tests**: Concurrent requests can't exceed cap; failed generation refunds.

**Browser QA**: Existing flows unaffected; cap enforcement still works.

**Acceptance criteria**: QuotaLedger model; consumption is atomic; concurrent safety; refund on failure.

**Rollback considerations**: Keep count-based fallback during migration.

**Stop condition**: Quota consumption is atomic and auditable.

---

## Phase 4A — Granular permissions and scoped roles

**Objective**: Replace role-string checks with a capability-based permission model.

**Included scope**: `Permission` + `RolePermission` + `ScopedAssignment` models. 20+ capabilities per §17.1. Moderator scoping (community/content/language/region). Deny-by-default middleware.

**Excluded scope**: No moderation cases yet (Phase 4B).

**Schema changes**: New `Permission`, `RolePermission`, `ScopedAssignment` models.

**Service changes**: `src/lib/auth.ts` — `hasPermission(capability, scope?)` resolver. Replace `isAdminRole` calls.

**API changes**: All admin APIs check specific permissions.

**UI changes**: Admin panel shows permission-based UI.

**Authorization requirements**: Deny-by-default; every request validates permission.

**Tests**: Admin without `licenses.manage` cannot access license API; moderator scoped to community X cannot action community Y.

**Browser QA**: Admin panel tabs respect permissions.

**Acceptance criteria**: Permission model; deny-by-default; scoped moderator assignments; no role-string checks remain.

**Rollback considerations**: High risk — touches all admin APIs. Feature-flag the new auth and roll out gradually.

**Stop condition**: All admin APIs use capability checks, not role strings.

---

## Subsequent phases (outline only — detail upon approval)

- **Phase 4B**: Moderation / Reports / Appeals / Sanctions
- **Phase 4C**: User suspension + private-data access logging
- **Phase 5A**: License Code System (redemption, batch, campaign)
- **Phase 5B**: Campaign / Dynamic Configuration
- **Phase 5C**: Capability resolver (dynamic, not hardcoded)
- **Phase 6A**: Communication (messaging between connections)
- **Phase 6B**: Career circles / Study groups / Peer review
- **Phase 6C**: Mentorship
- **Phase 7A**: Organization workspace model
- **Phase 7B**: Scoped org roles + sponsored seats
- **Phase 7C**: Institution integrations
- **Phase 8A**: Universal Search
- **Phase 8B**: Unified Inbox
- **Phase 8C**: Announcement read/dismiss state
- **Phase 9A**: Dashboard integration using stable real data
- **Phase 10A**: Design system audit + accessibility (WCAG AA)
- **Phase 10B**: Performance optimization
- **Phase 10C**: Security hardening (MFA, rate limits, CSRF)
- **Phase 10D**: Deployment readiness (CI/CD, health checks, env validation)

---

## Sequencing rule

**Do not schedule the final dashboard (Phase 9A) before its data sources (Evidence, Activity Events, Notifications, Opportunities, Quota Ledger) are stable.** The current dashboard is a prototype built on shallow heuristics — it must not be polished until the underlying data is real.
