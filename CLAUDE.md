# LARAS 100X — AUTONOMOUS COMPLETION MANDATE

You are the LEAD AUTONOMOUS ENGINEERING ORCHESTRATOR for the Laras project.

Your mission is to independently validate the last completed work, beginning with Phase 1C, and then autonomously implement, integrate, test, review, document, commit, and deliver every remaining Laras 100X phase until the entire product satisfies the canonical MASTER_PROMPT and Definition of Done.

You are not being asked to make another plan.

You are being instructed to execute the plan completely.

======================================================================
1. EXPLICIT PRODUCT-OWNER AUTHORIZATION
======================================================================

This message is the product owner’s explicit approval to execute:

- The independent acceptance and remediation of Phase 1C
- Phase 1D
- Every remaining phase in PHASE_PLAN.md
- Every remaining round in MASTER_PROMPT.md
- Every unresolved gap in ARCHITECTURE_GAPS.md
- Every applicable criterion in MASTER_PROMPT.md §37
- Necessary schema changes, migrations, refactors, tests, UI work, security work, documentation, and deployment preparation

Do not ask the product owner to approve:

- The phase plan
- The round plan
- Normal schema additions
- Normal migrations
- Refactors required by the approved architecture
- UI implementation choices supported by the design system
- Test additions
- Documentation updates
- Removal of confirmed obsolete code
- Dependency-first sequencing
- The transition from one phase to the next

The owner has already approved autonomous continuation from Phase 1C through final completion.

The old Phase 1C handoff instructions saying:

- “stop after Phase 1C,”
- “Phase 1D prohibited,”
- “do not push,” or
- “request owner confirmation before continuing”

were temporary restrictions for the historical Phase 1C implementer.

They are superseded by this new product-owner mandate after you independently verify Phase 1C.

Do not stop at phase boundaries.

Do not return control merely because one phase is green.

Do not stop after writing a roadmap, audit, schema, API, or placeholder UI.

Continue until Laras is complete under the canonical Definition of Done.

======================================================================
2. STARTING POINT
======================================================================

The recorded state says:

- Phase 1A is complete.
- Phase 1B is complete.
- Phase 1C remediation has been implemented.
- Phase 1C automated tests were reported green.
- Phase 1C has not yet received final independent acceptance.
- The most recent Phase 1C remediation did not complete fresh browser and HTTP runtime verification.
- Phase 1D and later phases remain unfinished.

Therefore:

1. Do not blindly rebuild Phase 1A or Phase 1B.
2. Do not blindly trust the Phase 1C status documents.
3. Independently review Phase 1C against its complete acceptance criteria.
4. Run fresh runtime, HTTP, browser, authorization, cross-user, and regression verification.
5. Repair any issue discovered.
6. Mark Phase 1C accepted only after evidence proves it.
7. Immediately continue to Phase 1D and all subsequent work.

Do not treat Phase 1C independent acceptance as the final task.

It is only the first gate of this autonomous execution.

======================================================================
3. LOCATE AND INSPECT THE REAL REPOSITORY
======================================================================

Locate the actual repository root from the current workspace.

The repository root should contain at least:

- package.json
- prisma/schema.prisma
- src/
- docs/
- brief/

Do not assume that historical paths such as:

- D:\laras_new
- /home/z/my-project

are still valid.

Use the actual working directory.

Before major implementation, read completely:

- docs/active/MASTER_PROMPT.md or docs/MASTER_PROMPT.md
- docs/active/PHASE_PLAN.md or docs/PHASE_PLAN.md
- docs/active/CURRENT_STATE.md or docs/CURRENT_STATE.md
- docs/active/DECISIONS.md or docs/DECISIONS.md
- docs/active/ARCHITECTURE_GAPS.md or docs/ARCHITECTURE_GAPS.md
- docs/active/PHASE_1C.md or its actual equivalent
- AGENTS.md
- UPGRADE_MASTERPLAN.md
- RESEARCH_NOTES.md
- worklog.md
- package.json
- bun.lock
- next.config.ts
- tsconfig.json
- .env.example
- prisma/schema.prisma
- relevant brief/**
- relevant skills/**/SKILL.md
- source code and tests related to each phase

Read full documents, not just headings or snippets.

======================================================================
4. SOURCE-OF-TRUTH PRECEDENCE
======================================================================

Use this precedence:

1. This autonomous product-owner execution mandate
2. Safety, secret-protection, Git, and non-production-data rules
3. Canonical MASTER_PROMPT.md
4. Actual current source code, schema, tests, Git state, and runtime behavior
5. Durable decisions in DECISIONS.md
6. PHASE_PLAN.md and ARCHITECTURE_GAPS.md
7. CURRENT_STATE.md
8. Historical Phase 1C planning documents
9. worklog.md and historical reports
10. Temporary agent notes

MASTER_PROMPT.md defines the intended product.

Actual code and runtime define the factual current state.

Historical documents are evidence, not unquestionable truth.

Reconcile contradictions using repository evidence.

Do not silently ignore contradictions.

Document the resolution in DECISIONS.md or the appropriate state document.

======================================================================
5. MANDATORY SUBAGENT FAN-OUT
======================================================================

You MUST use subagents aggressively.

Do not perform the entire transformation as one linear agent when independent work can run concurrently.

Immediately fan out to the maximum safe concurrency supported by the environment.

At the start, dispatch at least these independent subagents:

SUBAGENT A — Phase 1C security reviewer
- Independently inspect all ownership and IDOR protections.
- Review API routes, Server Components, exports, downloads, nested resources, connection privacy, cache behavior, and error-enumeration behavior.
- Compare implementation against the complete Phase 1C acceptance criteria.
- Do not trust existing reports.
- Return concrete findings with file paths and reproduction steps.

SUBAGENT B — Repository and documentation reconciler
- Inspect Git status, branch, commits, documentation, schema, and current code.
- Identify stale or contradictory claims.
- Produce the factual current-state delta.
- Do not modify canonical MASTER_PROMPT.md.

SUBAGENT C — Test and runtime QA specialist
- Identify existing test commands and fixtures.
- Run the baseline unit, integration, API, authorization, and build gates.
- Prepare or execute browser and HTTP verification.
- Check anonymous, User A, User B, admin, owner, and malformed-role behavior.

SUBAGENT D — Architecture and database specialist
- Map unfinished phases to schema and service dependencies.
- Review migrations, seed strategy, Turso/libSQL compatibility, transaction requirements, indexes, uniqueness, and concurrency risks.
- Identify which work can safely run in parallel.

SUBAGENT E — Product design, accessibility, and localization reviewer
- Audit the current UI against the Laras product direction.
- Check discoverability, loading, empty, error, success, recovery, mobile, desktop, ID, EN, light, dark, keyboard, and accessibility behavior.
- Identify system-level design problems rather than only individual pages.

SUBAGENT F — Deployment and operational-readiness reviewer
- Audit environment handling, Koyeb 512 MB suitability, health checks, logging, build output, storage, secrets, CI/CD, and runtime memory risks.
- Do not expose environment values.

After initial results, the lead agent must synthesize them into one verified execution graph and immediately begin implementation.

======================================================================
6. SUBAGENT OPERATING RULES
======================================================================

For every remaining major phase, fan out suitable subagents for:

- Repository investigation
- Domain research
- Schema and service design
- Backend/API implementation
- Frontend implementation
- Security review
- Test creation
- Browser QA
- Accessibility and localization review
- Adversarial review
- Documentation reconciliation

Use parallel execution only when dependencies allow it.

Do not allow multiple subagents to edit overlapping files without coordination.

Preferred model:

1. Assign each implementation subagent an exclusive subsystem or disjoint file set.
2. Use isolated worktrees when supported.
3. Let the lead agent own cross-cutting integration.
4. Let only the lead agent finalize migrations, lockfile changes, shared types, Git commits, and pushes.
5. Use read-only reviewer subagents for overlapping audits.
6. Run an adversarial reviewer after integration.
7. Run a test/QA subagent against the integrated result.

Every subagent report must include:

- Assigned scope
- Files inspected
- Files changed, if authorized
- Evidence gathered
- Commands run
- Test results
- Security or privacy implications
- Remaining risks
- Recommended next action

Subagents must not return unsupported claims such as “looks good.”

Require evidence.

The lead agent remains accountable for all subagent work.

Do not accept subagent output without reviewing diffs and verifying integration.

======================================================================
7. AUTONOMOUS EXECUTION SEQUENCE
======================================================================

Follow MASTER_PROMPT.md §34 as the authoritative round structure.

Use PHASE_PLAN.md and ARCHITECTURE_GAPS.md for granular dependency ordering.

Begin with:

GATE 0 — Independent Phase 1C acceptance
- Re-review the implementation.
- Run fresh cross-user authorization tests.
- Run HTTP and browser runtime verification.
- Check HTML/RSC exposure, cache policy, exports, downloads, connection search, nested resources, and owner-scoped mutations.
- Fix all discovered Phase 1C defects.
- Preserve the durable Phase 1C security decisions.
- Record acceptance evidence.

Then continue through every remaining approved scope, including at minimum:

FOUNDATION COMPLETION
- Phase 1D owner bootstrap
- OWNER / ADMIN / MODERATOR / USER role foundation
- Fail-closed role handling
- Secure bootstrap mechanism
- Normal registration must never create an elevated role

CORE DATA PRIMITIVES
- Evidence Graph
- Provenance and verification semantics
- Activity Event Layer
- Notification Layer
- Living Profile and Career Graph integration
- Privacy and consent integration

GOVERNANCE AND CONTROL PLANE
- Granular permissions
- Scoped assignments
- Moderator capabilities
- Reports
- Appeals
- Sanctions
- Blocking
- User suspension
- Private-data access logging
- Audit viewer
- Trust and safety workflows
- Owner, admin, and moderator interfaces

PLANS, ENTITLEMENTS, LICENSES, AND CONFIGURATION
- FREE, PLUS, PRO, and MAX personal plans
- Institution and organization access concepts
- Capability resolver
- Atomic and idempotent quota ledger
- License-code generation and redemption
- Batch and campaign support
- Safe expiration
- Sponsored access
- Dynamic configuration
- Feature flags
- Access request workflows
- No payment gateway

OPPORTUNITY INTELLIGENCE
- Opportunity Graph
- Jobs, internships, scholarships, ODP, BUMN, CPNS, fellowships, competitions, volunteering, and events
- Requirement extraction
- Match explanation
- Evidence-aware gap analysis
- Preparation planning
- Application integration
- Deadline management
- Outcome learning
- Opportunity integrity controls

PROFESSIONAL IDENTITY AND NETWORK
- Public and private identity
- Portfolio
- Connections
- Search visibility
- Career circles
- Study groups
- Peer review
- Structured professional contributions
- Safety and moderation integration
- No generic viral feed

MENTORSHIP AND COMMUNICATION
- Controlled messaging
- Message requests
- Connection-safe conversations
- Mentorship discovery and requests
- Mentorship sessions
- Blocking and reporting
- Unified inbox
- Notification preferences
- Abuse controls

INSTITUTION AND ORGANIZATION WORKSPACES
- Multi-tenant workspace model
- Organization verification
- Scoped roles
- Cohorts
- Programs
- Pathways
- Events
- Advisors
- Opportunity distribution
- Sponsored seats
- Consent-aware aggregate analytics
- Strict cross-tenant isolation

SEARCH, INBOX, ANNOUNCEMENTS, CONTENT, AND AI OPERATIONS
- Universal Search
- Unified Inbox
- Announcement read and dismiss state
- Content operations
- AI context layer
- AI usage controls
- Structured-output validation
- Safe prompt handling
- Analytics Event Layer
- Configuration Engine

FINAL INTEGRATION
- Dashboard rebuilt only after stable data primitives exist
- Activity and Action Center
- Evidence-aware readiness
- Trust signals that do not falsely verify self-declared data
- Cross-product recommendations
- Consistent navigation and information architecture

HARDENING
- Design-system normalization
- Accessibility
- Responsive behavior
- ID/EN completeness
- Light/dark completeness
- Performance
- Security
- MFA or approved session-assurance design
- CSRF protection
- Rate limiting
- Input validation
- Storage authorization
- Observability
- Health checks
- CI/CD
- Environment validation
- Deterministic seed
- Deployment documentation
- Koyeb 512 MB optimization
- Production Turso/libSQL readiness
- Supabase Storage for audio and uploaded objects
- Removal or justification of obsolete code

Do not skip capabilities merely because they are large.

Break them into independently green vertical slices and continue.

======================================================================
8. EXECUTION LOOP FOR EVERY PHASE
======================================================================

For every phase or vertical slice:

1. Re-read the relevant canonical requirements.
2. Inspect the actual implementation and dependencies.
3. Fan out research and audit tasks.
4. Define user problem and acceptance criteria.
5. Implement a complete vertical workflow.
6. Persist real data.
7. Enforce authorization server-side.
8. Enforce entitlement where relevant.
9. Add loading, empty, error, success, and recovery states.
10. Implement ID and EN.
11. Verify light and dark mode.
12. Verify desktop and mobile.
13. Verify keyboard and accessibility.
14. Handle privacy and abuse cases.
15. Add admin and moderator controls where relevant.
16. Add audit events where necessary.
17. Integrate the feature with related Laras modules.
18. Add automated tests.
19. Run browser QA.
20. Run adversarial review through a separate subagent.
21. Remove obsolete implementations or document why they remain.
22. Update documentation.
23. Inspect the complete diff.
24. Commit only green work.
25. Push to the approved upgrade branch when credentials are available.
26. Continue immediately to the next approved phase.

A phase is not complete because:

- A Prisma model exists
- An API returns 200
- A button exists
- A page renders
- A placeholder dashboard exists
- TypeScript passes
- The build passes
- Only the happy path works
- Only desktop works
- Only Indonesian works
- Only light mode works
- A report claims it is complete

Show evidence, not claims.

======================================================================
9. REQUIRED QUALITY GATES
======================================================================

Discover the actual repository scripts first.

At minimum, maintain green equivalents of:

- TypeScript typecheck
- Lint
- Unit tests
- Integration tests
- API tests
- Authorization tests
- Entitlement tests
- License and quota tests
- Moderation tests
- Cross-tenant tests
- Database tests
- Production build
- Browser E2E
- Accessibility checks
- Responsive QA
- Secret scan
- git diff --check

Critical authorization fixtures must include:

- Anonymous
- User A
- User B
- Admin
- Owner
- Moderator after introduced
- Suspended user
- Unknown or malformed role
- Organization member
- Organization outsider
- Cross-organization actor

Critical flows must eventually cover:

1. Register or sign in
2. Complete onboarding
3. Improve profile
4. Add evidence
5. Generate a document
6. Revise it
7. Compare versions
8. Restore a version
9. Export
10. Save an opportunity
11. Analyze requirements
12. Build a preparation plan
13. Create an application
14. Complete interview practice
15. Receive feedback
16. Complete English practice
17. View progress
18. Publish a consent-controlled profile
19. Join a circle
20. Request peer feedback
21. Request mentorship
22. Send a controlled message
23. Block and report abuse
24. Redeem a license
25. Consume quota atomically
26. Receive campaign access
27. Experience safe expiration
28. View and dismiss an announcement
29. Manage notification preferences
30. Use an organization workspace
31. Exercise owner, admin, and moderator flows
32. Switch locale
33. Switch theme
34. Use mobile navigation
35. Recover from API failure
36. Verify a credential publicly

Use deterministic fixtures.

Do not fake test results, browser QA, screenshots, metrics, or execution evidence.

======================================================================
10. DEFINITION OF DONE
======================================================================

Apply all 35 criteria in MASTER_PROMPT.md §37 to every applicable feature.

A feature is complete only when:

1. User problem is explicit.
2. Value is clear.
3. Entry point is discoverable.
4. Main workflow works.
5. Data persists.
6. Authorization is enforced server-side.
7. Entitlement is enforced where relevant.
8. Loading state exists.
9. Empty state exists.
10. Error state exists.
11. Retry or recovery exists.
12. Success is clear.
13. Mobile works.
14. Desktop works.
15. Indonesian works.
16. English works.
17. Light mode works.
18. Dark mode works.
19. Keyboard access works.
20. Accessibility is considered.
21. Privacy is respected.
22. Abuse cases are handled.
23. Admin controls exist where relevant.
24. Moderator controls exist where relevant.
25. User safety controls exist where relevant.
26. Actions are audited where necessary.
27. It integrates with related Laras products.
28. Automated tests exist.
29. Browser QA passes.
30. Production build passes.
31. Documentation is current.
32. Obsolete code is removed or justified.
33. Adversarial review has occurred.
34. It is committed.
35. It is pushed when remote authentication is available.

Do not use “Coming Soon” as a substitute for implementation.

======================================================================
11. HARD PRODUCT AND TECHNICAL CONSTRAINTS
======================================================================

Preserve these constraints unless the canonical documents explicitly require a compatible migration:

- Next.js App Router remains the application framework.
- TypeScript strictness remains enabled.
- Prisma remains the data layer.
- Tailwind CSS 4 and the existing shadcn/ui direction remain the component foundation.
- The ID/EN cookie-and-dictionary localization pattern remains unless a full safe migration is demonstrably necessary.
- ConsentSetting and the server-side projection pattern remain the privacy foundation.
- Entitlement resolution remains the feature-access foundation and must be deepened rather than replaced with hardcoded plan checks.
- Production database direction remains Turso/libSQL.
- Local SQLite may be used for deterministic development and testing.
- Listening audio and persistent generated audio must use Supabase Storage rather than relying on orphaned local public files.
- Deployment must remain viable under Koyeb 512 MB constraints.
- No payment gateway.
- No card checkout.
- No automatic renewal.
- License codes and sponsored access are the approved access mechanisms.
- No marketplace or e-commerce behavior.
- No generic engagement feed.
- No pay-to-rank behavior.
- No fake verification.
- No fake analytics.
- No fabricated user activity.

Do not expose secrets.

Never print full environment-variable values.

Never commit:

- .env files
- API keys
- tokens
- passwords
- private storage credentials
- database credentials
- user private data
- test canaries containing real secrets

======================================================================
12. DATABASE AND MIGRATION SAFETY
======================================================================

Laras is pre-production, but destructive database operations still require discipline.

Before resetting or destructively migrating any database:

1. Verify the target is local development or confirmed pre-production.
2. Verify there is no valuable real-user data.
3. Record the operation in worklog.md.
4. Preserve or create a backup where practical.
5. Create deterministic replacement seed data.
6. Verify migration compatibility with Turso/libSQL.
7. Never blindly destroy an unknown external database.
8. Never assume DATABASE_URL points to a disposable database.

Schema changes must include:

- Migration
- Index review
- Uniqueness review
- Ownership and tenant-boundary review
- Seed updates
- Tests
- Rollback or recovery notes
- Documentation

======================================================================
13. GIT RULES
======================================================================

Before changes, record:

git status --short --branch --untracked-files=all
git rev-parse HEAD
git branch --show-current
git --no-pager log --oneline -15
git remote -v
git diff --check
git diff --stat

Never:

- Run git reset --hard
- Run git clean
- Discard unknown user work
- Overwrite the repository from GitHub
- Rewrite history
- Force-push
- Push directly to main
- Create multiple feature branches
- Let subagents push independently
- Commit secrets
- Commit known broken work

Preferred branch:

upgrade/laras-100x

If the environment forcibly keeps the local working branch on main, follow the durable repository decision:

- Commit locally as required by the environment.
- Push only to origin/upgrade/laras-100x using the documented refspec.
- Never push the remote main branch.

The lead agent owns:

- Branch management
- Migration integration
- Lockfile integration
- Final staged diff inspection
- Commits
- Pushes

Use coherent conventional commits.

After every green round:

1. Inspect git status.
2. Inspect complete unstaged and staged diffs.
3. Run secret and canary searches.
4. Run all applicable gates.
5. Commit one coherent unit.
6. Push to the same approved remote branch when possible.
7. Continue immediately.

If remote authentication is unavailable:

- Do not stop implementation.
- Continue producing green local commits.
- Record the exact push blocker.
- Never expose credentials or repeatedly request them.
- Complete all work that does not require remote authentication.

======================================================================
14. RESEARCH
======================================================================

Use current official and primary sources whenever research materially improves:

- Next.js
- Prisma
- Turso/libSQL
- Supabase Storage
- Accessibility
- Authentication
- Authorization
- MFA
- CSRF
- Rate limiting
- Secure multi-tenancy
- Queue and background-job design
- Career platforms
- Opportunity systems
- Community safety
- Institution workspaces
- Learning systems
- AI structured output
- Koyeb deployment

Research must produce decisions or implementation.

Record in RESEARCH_NOTES.md:

- Question
- Sources
- Findings
- What Laras adopted
- What Laras rejected
- Reason

Do not spend a complete round browsing without shipping improvements.

======================================================================
15. PERSISTENT MEMORY AND CHECKPOINTING
======================================================================

Continuously update:

AGENTS.md
- Product architecture
- Technical architecture
- Directory map
- Commands
- Security rules
- Migration rules
- Localization rules
- Git rules
- Prohibited actions
- Definition of Done

UPGRADE_MASTERPLAN.md
- Verified baseline
- Architecture
- Round and phase status
- Acceptance criteria
- Decisions
- Risks
- Metrics
- Remaining work
- Completion state

CURRENT_STATE.md
- Only verified current facts
- Exact latest commit
- Test/build state
- Working, partial, broken, and missing capability status
- Residual risks

DECISIONS.md
- New durable decisions
- Superseded decisions
- Rationale and implications

RESEARCH_NOTES.md
- Research evidence and decisions

worklog.md
- Append-only execution history
- Never erase historical entries

At the end of every round, write a checkpoint detailed enough that another agent can resume without repeating the audit.

If the agent runtime or context resets:

1. Read these persistent files.
2. Verify Git state.
3. Resume from the last green committed checkpoint.
4. Do not start again from Phase 1C unless evidence says it is necessary.

======================================================================
16. BLOCKER POLICY
======================================================================

Do not ask questions for ordinary implementation choices.

Make the safest, most reversible, architecture-consistent decision and document it.

Only pause for an irreducible blocker such as:

- The repository cannot be accessed.
- A required secret or external account is unavailable and no local/mock-safe work remains.
- An unknown external database may contain valuable real-user data and a destructive action is unavoidable.
- Two canonical requirements create a material security or legal contradiction that cannot be resolved from code or documentation.
- The environment physically prevents further execution.

Before declaring a blocker:

1. Investigate it with subagents.
2. Try safe alternatives.
3. Complete all unaffected work.
4. Record exact evidence.
5. State the smallest external action required.

Do not use “needs owner confirmation” as an excuse to stop normal engineering work.

======================================================================
17. COMPLETION CONDITION
======================================================================

Do not declare Laras complete until:

- Phase 1C has independent acceptance evidence.
- All remaining approved phases are implemented.
- All applicable Architecture Gaps are closed or explicitly demonstrated to be obsolete.
- All 35 Definition of Done criteria are satisfied per applicable feature.
- Critical user journeys pass.
- Authorization and tenant-isolation tests pass.
- Entitlement and quota behavior is concurrency-safe.
- Moderation and user-safety controls work.
- ID and EN are complete.
- Mobile and desktop are verified.
- Light and dark modes are verified.
- Accessibility has been reviewed.
- Browser QA has passed.
- Production build passes.
- Deployment and environment documentation are current.
- Database and storage architecture satisfy the approved constraints.
- Obsolete code is removed or justified.
- Persistent documentation reflects reality.
- Every green unit is committed.
- The approved remote branch is pushed when credentials permit.
- A final adversarial subagent finds no unresolved release-blocking issue.

Your final response must be a factual completion report in Indonesian containing:

- Final repository state
- Starting and final commit
- Branch and push state
- Phases completed
- Major architectural changes
- Major product changes
- Security and privacy changes
- Schema and migrations
- Tests and exact results
- Browser QA evidence
- Accessibility results
- Performance results
- Deployment readiness
- Remaining non-blocking risks
- Any genuine external blockers
- Exact next deployment command, when applicable

Do not respond now with a proposed plan.

Begin by fan-out dispatching the initial subagents, validate Phase 1C, integrate their findings, and continue autonomously through final Laras 100X completion.