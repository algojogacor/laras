# ARCHITECTURE_GAPS.md

For every missing or shallow Laras 100X capability: current state, target state, dependency, risk of premature implementation, recommended phase, and acceptance criteria.

**Canonical reference:** `docs/MASTER_PROMPT.md` (§9.1 Laras Core, §17 Governance, §23 Plans, §24 Entitlement Engine, §25 License Code System, §34 Ten-Round Execution Map, §37 Definition of Done).

**Note on phase numbering:** The phases below are cross-referenced to the brief's §34 Suggested Ten-Round Execution Map. The brief's round structure is the authoritative ordering; the phase numbers here are for granular tracking within each round.

## Dependency graph (topological order)

```
Phase 1: Foundations
  1A. Type-safety + build green (BLOCKER — nothing else ships without this)
  1B. Server-side consent enforcement + public profile data filtering
  1C. Ownership authorization on all resource APIs
  1D. Owner bootstrap + role model (OWNER/ADMIN/MODERATOR/USER)

Phase 2: Core data primitives
  2A. Evidence Graph (Evidence model + provenance)
  2B. Activity Event Layer (durable event store)
  2C. Notification Layer (store + read state + delivery)

Phase 3: Opportunity + orchestration
  3A. Opportunity Graph (Opportunity model + requirement extraction)
  3B. Match explanation + gap analysis (depends on 2A Evidence)
  3C. Quota Ledger (atomic, idempotent entitlement consumption)

Phase 4: Governance + moderation
  4A. Granular permissions + scoped assignments (depends on 1D)
  4B. Moderation / Reports / Appeals / Sanctions
  4C. User suspension + private-data access logging

Phase 5: Entitlement + license codes
  5A. License Code System (redemption, batch, campaign)
  5B. Campaign / Dynamic Configuration
  5C. Capability resolver (dynamic, not hardcoded plan features)

Phase 6: Network + communities
  6A. Communication (messaging between connections)
  6B. Career circles / Study groups / Peer review
  6C. Mentorship

Phase 7: Institutions + organizations
  7A. Organization workspace model
  7B. Scoped org roles + sponsored seats
  7C. Institution integrations

Phase 8: Search + inbox + announcements
  8A. Universal Search
  8B. Unified Inbox
  8C. Announcement read/dismiss state (depends on 2B Activity Events)

Phase 9: Dashboard integration (only after data sources are stable)
  9A. Dashboard rewrite using stable real data (Evidence, Activity, Notifications)

Phase 10: Hardening
  10A. Design system audit + accessibility
  10B. Performance optimization
  10C. Security hardening (MFA, rate limits, CSRF)
  10D. Deployment readiness (CI/CD, health checks, env validation)
```

---

## Gap details

### 1A. Type-safety + build green
- **Current**: 10 pre-existing TS errors (nullable field mismatches in dashboard, public profile, connections panel, privacy panel, connections lib). Build fails.
- **Target**: `tsc --noEmit` and `bun run build` pass with 0 errors.
- **Dependency**: None (this is the foundation).
- **Risk of doing too early**: None — must be first.
- **Recommended phase**: 1A (immediate).
- **Acceptance criteria**: `bunx tsc --noEmit` exits 0; `bun run build` exits 0.

### 1B. Server-side consent enforcement
- **Current**: `filterProfileByConsent` defined but never used. Public profile passes full unredacted data in RSC payload. UI-only consent.
- **Target**: Server filters profile data BEFORE serialization. RSC payload contains only consented fields. `filterProfileByConsent` called in the page server component.
- **Dependency**: None.
- **Risk of doing too early**: None — critical security fix.
- **Recommended phase**: 1B.
- **Acceptance criteria**: Public viewer's page source contains NO private/connections-only field values; only "public" fields + lock indicators.

### 1C. Ownership authorization on resource APIs
- **Current**: Most `/api/[resource]/[id]` routes check `getSession()` but not ownership. Any authenticated user could potentially access another user's documents/applications.
- **Target**: Every resource API verifies `resource.userProfileId === session.profile.id` (or admin).
- **Dependency**: None.
- **Risk of doing too early**: None — critical security fix.
- **Recommended phase**: 1C.
- **Acceptance criteria**: User A cannot read/update/delete User B's documents, applications, interview sets, or english sessions via API.

### 1D. Owner bootstrap + role model
- **Current**: 3 roles (user/admin/owner) set via DB script. No MODERATOR. No permission model. No secure bootstrap.
- **Target**: 4 roles (OWNER/ADMIN/MODERATOR/USER). Secure first-owner bootstrap via env/CLI. Permission model with 20+ capabilities (§17.1). Deny-by-default authorization.
- **Dependency**: None.
- **Risk of doing too early**: None.
- **Recommended phase**: 1D.
- **Acceptance criteria**: First owner created via secure bootstrap; MODERATOR role exists; permission checks on admin APIs use capability resolver, not role string.

### 2A. Evidence Graph
- **Current**: No Evidence model. Skills have optional `context` text. Experiences have `contextNotes`. No structured evidence (project names, metrics, proof artifacts, verification status).
- **Target**: Evidence model linked to Experience/Skill/Achievement. Each evidence has a type (project, metric, artifact, testimonial), provenance, and verification status.
- **Dependency**: 1A (type-safety).
- **Risk of doing too early**: Low.
- **Recommended phase**: 2A.
- **Acceptance criteria**: Evidence model exists; users can attach evidence to experiences/skills; evidence has provenance + verification status (not auto-verified).

### 2B. Activity Event Layer
- **Current**: Dashboard computes activity on-the-fly from documents/applications/interviews/english. Not durable.
- **Target**: ActivityEvent model (durable, append-only). Every user action emits an event. Dashboard reads from the event store.
- **Dependency**: 1A.
- **Risk of doing too early**: Low.
- **Recommended phase**: 2B.
- **Acceptance criteria**: ActivityEvent model; events emitted on document/application/interview/english creation; dashboard timeline reads from events.

### 2C. Notification Layer
- **Current**: No Notification model. Header badge counts pending connections per-request.
- **Target**: Notification model with type, read state, metadata. Delivered via badge + future inbox. Read/dismiss tracking.
- **Dependency**: 2B (Activity Events can trigger notifications).
- **Risk of doing too early**: Low.
- **Recommended phase**: 2C.
- **Acceptance criteria**: Notification model; connection requests create notifications; header badge reads from store; mark-as-read works.

### 3A. Opportunity Graph
- **Current**: No Opportunity model. Application tracks user's own applications only. No discovery, no requirement extraction.
- **Target**: Opportunity model (job/internship/scholarship/etc.) with requirements, deadlines, source. Requirement extraction from pasted JDs. Match explanation + gap analysis against Career Graph.
- **Dependency**: 2A (Evidence for gap analysis).
- **Risk of doing too early**: Medium — without Evidence, match quality is shallow.
- **Recommended phase**: 3A.
- **Acceptance criteria**: Opportunity model; users can save/discover opportunities; requirement extraction works; match explanation shows profile-vs-requirement gaps.

### 3C. Quota Ledger
- **Current**: Entitlement checks are stateless `count()` queries. Not atomic, not idempotent, not concurrency-safe.
- **Target**: QuotaLedger model. Every consumption is an atomic, idempotent ledger entry. Reversible on failure. Auditable.
- **Dependency**: 1A.
- **Risk of doing too early**: Low.
- **Recommended phase**: 3C.
- **Acceptance criteria**: QuotaLedger model; document/interview generation consumes atomically; concurrent requests can't exceed cap; failed generations refund.

### 4A. Granular permissions + scoped assignments
- **Current**: `isAdminRole(role)` checks role string. No permission model. No scoped assignments.
- **Target**: Permission model (20+ capabilities per §17.1). Scoped assignments (moderator scoped by community/content/language/region). Deny-by-default. RBAC + ABAC + ReBAC.
- **Dependency**: 1D (role model).
- **Risk of doing too early**: Low.
- **Recommended phase**: 4A.
- **Acceptance criteria**: Permission model; admin APIs check specific permissions not just role; moderators can be scoped; deny-by-default enforced server-side.

### 4B. Moderation / Reports / Appeals / Sanctions
- **Current**: Completely missing.
- **Target**: Report, ModerationCase, Appeal, Sanction models. Moderation center in admin. Appeals workflow.
- **Dependency**: 4A (permissions), 1D (moderator role).
- **Risk of doing too early**: Medium — needs stable permission model first.
- **Recommended phase**: 4B.
- **Acceptance criteria**: Users can report content; moderators can action reports; appeals workflow exists; sanctions enforceable.

### 5A. License Code System
- **Current**: License model (admin-granted only). No redemption codes.
- **Target**: LicenseCode model with individual/batch/campaign/trial/sponsored types. Redemption endpoint. Stacking. Expiration. Downgrade.
- **Dependency**: 3C (Quota Ledger for consumption).
- **Risk of doing too early**: Low.
- **Recommended phase**: 5A.
- **Acceptance criteria**: LicenseCode model; users can redeem codes; batch/campaign codes work; stacking + expiration enforced.

### 5C. Capability resolver
- **Current**: `PLAN_FEATURES` hardcoded per plan. `hasFeature` checks a static Set.
- **Target**: Dynamic capability resolver combining plan + license + sponsored + campaign + feature flag + sanction. Not hardcoded.
- **Dependency**: 5A (license codes), 5B (dynamic config).
- **Risk of doing too early**: Medium — needs license + config foundations.
- **Recommended phase**: 5C.
- **Acceptance criteria**: Capability resolver reads from multiple sources; feature flags can override plan defaults; admin can grant specific capabilities.

### 6A. Communication
- **Current**: No Message model. "Send message" button is a stub.
- **Target**: Message model between connections. Real-time or async messaging.
- **Dependency**: 1C (ownership auth), 2C (notifications).
- **Risk of doing too early**: Low.
- **Recommended phase**: 6A.
- **Acceptance criteria**: Message model; connections can message; consent-aware; notifications on new message.

### 7A. Institution / Organization workspaces
- **Current**: Completely missing.
- **Target**: Organization model with cohorts, programs, pathways, advisor assignment, opportunity distribution, aggregate analytics.
- **Dependency**: 4A (scoped roles), 5A (sponsored seats).
- **Risk of doing too early**: High — needs stable governance + entitlement foundations.
- **Recommended phase**: 7A.
- **Acceptance criteria**: Organization model; org roles; cohort management; sponsored seats; consent-aware analytics.

### 8A. Universal Search
- **Current**: Missing.
- **Target**: Search index across profile, documents, opportunities, connections.
- **Dependency**: 3A (Opportunity Graph), 1B (consent-aware results).
- **Risk of doing too early**: High — needs stable data models + consent enforcement.
- **Recommended phase**: 8A.
- **Acceptance criteria**: Search API; consent-filtered results; covers profiles + opportunities + content.

### 9A. Dashboard integration
- **Current**: Prototype dashboard with real but shallow data (readiness, trust, activity, announcements).
- **Target**: Dashboard reads from stable data sources (Evidence, Activity Events, Notifications, Opportunities) with explainable scores.
- **Dependency**: 2A, 2B, 2C, 3A (all data sources must be stable).
- **Risk of doing too early**: HIGH — the brief explicitly says "Do not schedule the final dashboard before its data sources are stable."
- **Recommended phase**: 9A.
- **Acceptance criteria**: Dashboard scores are explainable from evidence; activity timeline reads from event store; notifications surface; no shallow heuristics.

### 10A–10D. Hardening
- **Current**: Basic a11y (skip-link, focus-visible); no CI/CD; no MFA; no perf audit; no health checks.
- **Target**: Full design system audit, a11y audit, perf optimization, security hardening, deployment readiness.
- **Dependency**: All prior phases.
- **Risk of doing too early**: High — hardening unstable code wastes effort.
- **Recommended phase**: 10A–10D.
- **Acceptance criteria**: WCAG AA compliance; Lighthouse > 90; security audit passed; CI/CD pipeline; health checks; env validation.
