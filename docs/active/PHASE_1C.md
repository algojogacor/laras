# Phase 1C — Resource Ownership Authorization and IDOR Closure

## 1. Baseline

| Item | Verified value |
|---|---|
| Repository | `D:\laras_new` |
| Branch | `main` |
| Starting commit | `0014427d7ff3966b2ce4e3c7c8358740034770af` (`fix: enforce server-side public-profile consent`) |
| Previous commits | `561589c` Phase 1A; `0014427` Phase 1B |
| Working tree before planning | Clean (`git status --short --branch` returned only `## main`) |
| Phase state | Phase 1B accepted; Phase 1C implementation not started |
| Schema changes allowed | None |
| Frozen UI | Dashboard and landing page |
| Push | Prohibited |

Graphify was updated incrementally with `graphify update . --force`; the force flag allowed the intended removal of 15 previously indexed public audio files. The restricted code corpus contains 234 code files and produced 2,312 nodes, 4,494 edges, and 322 communities. Local `.graphifyignore` and `.git/info/exclude` keep `skills/`, `download/`, `upload/`, `tool-results/`, `graphify-out/`, `node_modules/`, build output, `public/audio/`, generated/output directories, and temporary artifacts out of the active corpus. `D:\laras-referensi` was not indexed or modified.

The installed Graphify graph still contains legacy semantic nodes from artifact directories created before those exclusions. They were treated as stale orientation data and were not used as evidence. Every conclusion below was checked against tracked source, `prisma/schema.prisma`, auth/session code, route handlers, Server Components, and the current test suite.

Current surface counts:

- 27 Prisma models reviewed.
- 42 API route files and 57 exported handlers reviewed.
- 39 route files / 54 handlers currently access Prisma.
- Three non-database handlers: `POST /api/auth/logout`, `POST /api/locale`, and `GET /api`.
- No `"use server"` Server Actions exist under `src/`.
- One test file exists: `src/lib/public-profile.test.ts`; it covers Phase 1B projection, not resource ownership routes.

## 2. Objective

Establish one consistent, deny-by-default ownership authorization boundary so anonymous users and authenticated non-owners cannot read, mutate, delete, link, export, download, or enumerate resources outside their permitted scope.

Phase 1C closes direct and indirect IDOR through URL parameters, query parameters, JSON IDs, nested IDs, list/search results, exports, state transitions, and bulk inputs. Opaque CUIDs are locators, never authorization controls. The implementation must preserve existing legitimate public surfaces and current role semantics without starting Phase 1D.

## 3. Current Authentication and Role Model

`src/lib/auth.ts:getSession()` reads the `laras_session` httpOnly cookie, verifies its HS256 JWT, then reloads `Account` by the trusted `sub` claim and returns `{ userId, email, role }`. The database lookup means a deleted account or changed role takes effect on the next request. The only current roles are free-form strings used as `user`, `admin`, and `owner`. `isAdminRole()` treats `admin` and `owner` alike.

`src/proxy.ts:proxy()` performs optimistic route authentication and permits public prefixes `/api/auth`, `/api/locale`, `/verify`, and `/u`. It is not a resource authorization boundary. Every protected handler and Server Component must still authenticate and authorize itself.

There is no Auth.js/NextAuth runtime, no moderator role, no organization/institution membership, no scoped permission model, and no system principal. Scripts that populate question banks are developer operations, not web actors. Phase 1D owns moderator introduction, owner bootstrap, and role redesign.

Temporary Phase 1C role policy:

- `user`: may access only resources owned through the session account/profile, plus explicitly public/platform-scoped resources.
- `admin` and `owner`: retain access to existing `/api/admin/*` endpoints through `isAdminRole()`; this is a documented compatibility boundary, not a new blanket bypass.
- `admin` and `owner` receive **no automatic override** for private user-owned documents, applications, interview answers, English attempts, exports, or downloads in Phase 1C.
- Unknown role strings receive normal user ownership scope and are denied from admin routes.
- Moderator and organization/institution actors do not exist and receive no invented access.

This temporary rule intentionally narrows the older `docs/PHASE_PLAN.md` phrase “ownership + admin override.” The master prompt says not all admins automatically have all permissions, and Phase 1D/4A have not defined a safe private-data permission. Any requested admin read of private user content is an ambiguity that must stop implementation for owner review.

## 4. Threat Model

In scope:

- Guessing or obtaining a CUID/opaque ID and changing route parameters.
- Replacing body or query IDs, including `profileId`, `addresseeId`, `documentId`, `sessionId`, `questionId`, `licenseId`, and announcement IDs.
- Combining a parent owned by User A with a child owned by User B.
- Reassigning owner or foreign-key fields through mass assignment.
- Reading private fields through list, connection, search, pagination, or nested includes.
- Exporting/downloading another user's data even where normal reads are protected.
- Mixed-owner bulk operations and duplicate/ambiguous input.
- Calling current or future Server Actions directly over the network.
- Confusing the current broad `admin`/`owner` role check with authorization to private user data.
- Inferring existence, ownership, relationship state, or workflow state from status, message, body shape, or avoidable timing differences.
- Authorize-then-mutate races and parent ownership changes between separate queries.
- Cache reuse across viewer/owner scopes.

Out of scope as vulnerabilities unless an implemented surface violates its stated policy:

- Missing Opportunity, organization, moderator, upload-record, or Export models.
- The intentionally public certificate verification locator.
- Phase 1B's consent-scoped public profile.
- Future verification, entitlement, quota, or license-code semantics.

## 5. Resource Inventory

“C” means create, “R” read/list, “U” update/status, “D” delete, and “X” export/download. Tests named here are requirements for the implementation phase, not tests created during planning.

| Prisma resource | Owner field / chain and parent | Current surfaces and operations | Current authorization and observed risk | Required Phase 1C policy and tests | Scope |
|---|---|---|---|---|---|
| `Account` | Self: `Account.id === session.userId`; optional child `profile` | `auth/signup` C; `auth/login`, `auth/me` R; `auth/delete` D; `admin/users` R | Signup derives identity; delete uses session ID. Admin list is role-gated. No client owner assignment. | Preserve self-only account read/delete; unknown role denied admin list. Test anonymous, User A vs B, admin list denial/allow. | 1C regression |
| `UserProfile` | `accountId -> Account.id` | `profile` R/C/U; `/u/[profileId]` consent R; connection search/list; admin targets | Owner endpoints use session `accountId`. Public route uses Phase 1B projection. Connection APIs bypass that projection for some fields. | Central actor profile lookup; never accept owner ID; preserve public projection; connection output must be viewer/consent scoped. | 1C |
| `Experience` | `userProfileId -> UserProfile` | `profile` PUT replaces C/R/D children; document generation reads | Recreated with session profile ID; request IDs ignored. | Keep parent-scoped transaction; reject non-array/malformed relation bodies; test attempted `userProfileId`/`id` injection has no effect. | 1C regression |
| `Education` | `userProfileId -> UserProfile` | Same profile PUT/read flows | Same as Experience. | Same parent-chain policy and injection tests. | 1C regression |
| `Skill` | `userProfileId -> UserProfile` | Same profile PUT/read flows | Same as Experience. | Same parent-chain policy and injection tests. | 1C regression |
| `Certification` | `userProfileId -> UserProfile` | Same profile PUT/read flows | Same as Experience. | Same parent-chain policy and injection tests. | 1C regression |
| `LanguageProficiency` | `userProfileId -> UserProfile` | Same profile PUT/read flows | Same as Experience. | Same parent-chain policy and injection tests. | 1C regression |
| `Application` | `userProfileId -> UserProfile` | `applications` C/R; `applications/[id]` U/D; page reads | Lists and initial lookups are owner-scoped. U/D are check-then-act with a later ID-only write. | Allowlisted body fields; owner-scoped atomic U/D; foreign and missing IDs return identical 404. | 1C |
| `Document` | `userProfileId -> UserProfile` | list/generate C/R; `[id]` D; revise U; type exports X; detail pages R | Most reads use `{id,userProfileId}`. Delete/revise perform later ID-only writes; exports are currently scoped. | Shared owner-scoped find/mutate helpers; type constraint for typed routes; owner-scoped export and no-store response. | 1C |
| `DocumentVersion` | `documentId -> Document -> UserProfile` | CV creation C; versions R; revise C | Versions are listed only after parent auth; child query itself only filters `documentId`. Revision sequence is multi-query and non-atomic. | Authorize through `Document`; perform revision/version/document writes in one transaction; test cross-parent child ID and concurrent version conflict. | 1C |
| `RevisionRequest` | `documentId -> Document -> UserProfile` | revise C/U | Created only after an owner-scoped document read, but success/failure writes are outside one transaction. | Parent-owned transaction; no request-provided `documentId` or owner fields; rollback partial state. | 1C |
| `ApplicationDocument` | Both `applicationId -> Application -> UserProfile` and `documentId -> Document -> UserProfile` | application documents POST/DELETE | POST verifies both parents. DELETE verifies only application before `(applicationId, documentId)` delete. | Both parents must resolve to same actor; all-or-nothing link/unlink; duplicate link is 409. Test crossed parent/child IDs. | 1C |
| `InterviewSet` | `userProfileId -> UserProfile` | list/create C/R; `[id]` R/D; page R | Direct reads are owner-scoped; delete is check-then-ID-only-delete. | Owner-scoped atomic delete; nested questions authorized through set. | 1C |
| `InterviewQuestion` | `interviewSetId -> InterviewSet -> UserProfile` | feedback R/U; set/page nested R | Feedback loads by question + set, then compares parent owner and returns 401 for a foreign owner. | One parent/owner-scoped query; foreign/missing/mismatch all 404; owner-scoped update. | 1C |
| `Essay` | `userProfileId -> UserProfile` | No Prisma call or route; essay product currently stores `Document(type="essay")` | Persisted model is unused; absence is not an IDOR. | No new route. Add only a schema/inventory regression assertion if useful. | Excluded implementation |
| `EnglishSession` | `userProfileId -> UserProfile` | English generate C; submit R/U; certificate creation R | Submit/certificate creation use `{id,userProfileId}` then ID-only update/create child. | Owner-scoped session lookup/update; certificate child must use the authorized session; test foreign session and body owner injection. | 1C |
| `ListeningQuestion` | Platform/system catalog; no user owner | English generation R; scripts C/U | Web reads only published rows with audio; no client ID selector. | Treat as read-only platform catalog; no user mutation. Regression test unpublished rows cannot be selected. | 1C regression |
| `EnglishCertificate` | `userProfileId -> UserProfile`; optional `sessionId` logical parent | owner API C/R; private page R; public verify R | Owner reads are scoped. Public `certificateId` verification is intentional and returns a documented subset. | Owner ID route remains scoped; public code route remains explicit public policy and must not expose storage paths or session/user IDs. | 1C |
| `Achievement` | `userProfileId -> UserProfile` | Dashboard/profile reads; no resource API mutation | Read through owner profile includes. No client ID surface. | Preserve parent-scoped reads; no new API. | 1C regression |
| `AuditLog` | `userProfileId -> UserProfile` denotes subject; actor is in metadata/session | Connection/privacy/admin writes; no read API | Admin announcement logging uses invalid `"system"` FK and silently drops the log; this is an audit gap, not an IDOR. | Authorization decisions may emit minimal best-effort events only if an existing valid subject exists; do not add audit redesign or leak target IDs. | Deferred except regression |
| `ReadingQuestion` | Platform/system catalog | No current API read/write; generation is on-demand | No user-owned route. | No Phase 1C route or schema work. | Excluded |
| `StructureQuestion` | Platform/system catalog | No current API read/write; generation is on-demand | No user-owned route. | No Phase 1C route or schema work. | Excluded |
| `VerificationBadge` | `userProfileId -> UserProfile`; admin-managed | admin verification C/U; admin users R; public profile indicator R | Admin role is checked before target lookup. Public projection omits evidence/note/IDs. | Preserve role gate; target IDs are admin command targets, not caller identity; no private-data admin bypass. | 1C regression |
| `License` | `userProfileId -> UserProfile`; admin-managed | admin licenses C/R/U; entitlement reads | Admin/owner role gate; body selects target profile/license. | Preserve explicit admin endpoint policy and audit; non-admin 403 before target lookup; no user-owned-resource override. | 1C regression |
| `ConsentSetting` | `userProfileId -> UserProfile` | privacy R/U; public projection R | Owner is session-derived; Phase 1B projection is fail-closed. Connection APIs do not consistently apply it. | Reuse public/connection visibility policy for directory/connection DTOs; owner cannot be body-supplied. | 1C |
| `Connection` | Two actors: `requesterId` and `addresseeId` | list/search/request R/C; `[id]` status U; public profile relationship R | Requester is session-derived, but list/search disclose unprojected profile fields. Status helpers load then return distinct state/owner errors before update. | Relationship-scoped DTO; addressee-only atomic transition `{id,addresseeId,status:"pending"}`; enumeration-safe errors. | 1C |
| `Announcement` | Platform resource; admin-managed, audience-scoped | admin C/R/U/D; user R | Admin/owner role gate; published list uses audience. No user owner. | Preserve admin-only mutation and audience-scoped read; unknown role denied; no private-resource admin implication. | 1C regression |

Persisted concepts requested by the brief but not separate models:

- Resumes, cover letters, bios, decks, and generated essays are `Document.type` variants.
- TOEFL/listening/reading/structure attempts are `EnglishSession` records.
- Exports/downloads are generated responses and `Document.fileUrl` / certificate path fields; there is no `Export` model.
- Uploaded file metadata has no first-class model or upload route in the current API. `photoUrl`, `fileUrl`, `pdfStoragePath`, and `pdfUrl` are scalar fields.
- There is no Opportunity, SavedOpportunity, organization/institution, verification-request/evidence, moderation, restore, or bulk-operation model/route. These absences are not labeled vulnerabilities.

## 6. Route and Server-Action Inventory

Every database-backed API handler is listed below. “Scoped” describes current code, not final acceptance.

| Route file and handler | Models / operation | Client locator | Current behavior | Phase 1C action |
|---|---|---|---|---|
| `api/auth/signup` POST | `Account`, `UserProfile`, `License`, `ConsentSetting` C | Body email | Creates identity from validated signup, fixed `user` role | Regression only; owner fields never accepted |
| `api/auth/login` POST | `Account` R | Body email | Authenticates and issues session | Regression only |
| `api/auth/me` GET | `Account`, profile R | Session | Session-account scoped | Regression only |
| `api/auth/delete` POST | `Account` D | Session | Deletes `session.userId` | Regression only |
| `api/profile` GET/PUT/PATCH | profile and five child collections C/R/U/D | Body fields, no accepted owner ID | Session-account scoped; PUT replaces children transactionally | Validate/strip hostile IDs and keep parent-scoped transaction |
| `api/profile/privacy` GET/PATCH | `ConsentSetting`, `AuditLog` R/U/C | Body settings | Session-profile scoped | Reuse actor context; preserve Phase 1B invariants |
| `api/export` GET | Profile + five child collections X | Session | Exports only current profile | Mark private/no-store; owner test |
| `api/documents` GET | `Document` R | Session | Owner list | Central scope and enumeration regression |
| Four document `generate` POST routes | profile R; `Document` C; CV also `DocumentVersion` C | Body config/edits | Owner derived from session | Reject owner/FK fields; created rows use actor profile only |
| `api/documents/[id]` DELETE | `Document` D | URL ID | Owner read, then ID-only delete | Atomic owner-scoped delete |
| `api/documents/[id]/versions` GET | `Document`, `DocumentVersion` R | URL ID | Parent owner check, then child list | Parent relation scope in production helper |
| `api/documents/[id]/revise` POST | document/version/revision C/R/U | URL ID; body instruction/type | Parent owner read; multi-step writes | One transaction after LLM result, conflict-safe versioning |
| Four typed document `[id]/export` GET routes | `Document`, profile X | URL ID | Owner + type scoped | Shared authorized document loader, private/no-store |
| `api/documents/deck/export` GET | Profile X | Query theme, no resource ID | Current profile only; live generated deck | Validate theme; private/no-store |
| `api/documents/essay/probe` POST | Profile R | Body answers/content | Current profile locale only | Regression; no persisted target ID |
| `api/applications` GET/POST | `Application`, `ApplicationDocument` R/C | Body application data | Owner list/create; creator ID session-derived | Central scope and body allowlist |
| `api/applications/[id]` PATCH/DELETE | `Application` U/D | URL ID; body fields | Owner read then ID-only write | Atomic owner-scoped mutation |
| `api/applications/[id]/documents` POST/DELETE | `Application`, `Document`, link C/D | URL app ID; body/query doc ID | POST checks both owners; DELETE only parent app | Same-owner parent/child policy; duplicate/mismatch semantics |
| `api/applications/summarize` POST | Profile R | Body job description | Auth/profile gate; no persisted resource ID | Regression only |
| `api/interview-sets` GET/POST | `InterviewSet`, `InterviewQuestion` C/R/D | Body content | Owner list/create; cleanup on generation failure | Actor-derived owner; transaction/cleanup regression |
| `api/interview-sets/[id]` GET/DELETE | Set/questions R/D | URL ID | Owner read; delete check-then-act | Atomic scoped delete; 404 foreign/missing |
| `api/interview-sets/[id]/feedback` POST | question/set R/U | URL set ID; body question ID | Loads child+parent, then owner compare returning 401 | One owner/parent-scoped read and update; 404 oracle-safe |
| `api/english/generate` POST | profile/catalog R; `EnglishSession` C | Body module/difficulty | Session-derived owner | Validate enum; owner injection ignored/rejected |
| `api/english/submit` POST | `EnglishSession` R/U | Body session ID | Owner read then ID-only update | Atomic owner-scoped update |
| `api/english/certificates` POST/GET | session R; certificate C/R | Body session ID | Session is owner-scoped; list owner-scoped | Parent owner helper; prevent duplicate/race policy (409 if applicable) |
| `api/english/certificate/[id]` GET | `EnglishCertificate` R | URL row ID | Owner-scoped | Preserve 404 foreign/missing |
| `api/connections` GET | profile/connection R | Query `q` | Lists/searches unprojected other-user data | Consent-aware DTO and non-enumerating search policy |
| `api/connections` POST | connection/audit C | Body addressee profile ID | Requester session-derived; helper exposes pair state | Validate target under directory policy; generic conflict result |
| `api/connections/[id]` PATCH | connection U; audit C | URL ID; body action | Helper checks addressee/status then ID-only update; detailed 400 | Atomic scoped transition; 404 foreign/missing, 409 owned invalid state |
| `api/announcements` GET | announcement/license/profile R | Session audience | Published audience-scoped list | Regression only |
| `api/admin/users` GET | account/profile/badges R | None | `isAdminRole` before query | Explicit admin compatibility policy; non-admin 403 |
| `api/admin/verification` POST | profile/badge/audit C/U | Body profile/type | `isAdminRole` before target lookup | Preserve role gate; validate body; no new private bypass |
| `api/admin/licenses` GET/POST/PATCH | license/profile/audit C/R/U | Body profile/license IDs | `isAdminRole` before target operations | Preserve role gate; explicit 403; target errors only after authorization |
| `api/admin/announcements` GET/POST/PATCH/DELETE | announcement/audit C/R/U/D | Body/query ID | `isAdminRole`; delete hides missing | Preserve admin policy; validate locator; consistent state conflict |

Non-API server reads with client URL locators were also reviewed:

- Document detail pages for bio, cover letter, CV ATS, and essay scope by `{ id, userProfileId, type }`.
- Interview and private certificate detail pages scope by `{ id, userProfileId }`.
- `src/app/(app)/documents/cv-visual/[id]/page.tsx` does not load the ID and always calls `notFound()` after session/profile resolution.
- `src/app/u/[profileId]/page.tsx` is the Phase 1B consent-scoped public profile and is explicitly dynamic.
- `src/app/verify/certificate/[code]/page.tsx` is intentionally public-by-code and displays the current documented verification subset.

There are no Server Actions today. Any Server Action introduced while implementing Phase 1C is prohibited unless the plan is amended; future actions must be treated like public mutation endpoints and call the same production authorization layer on every invocation.

## 7. Confirmed Vulnerabilities

### C1 — Connection search enumerates profiles and private email (High)

- Location: `src/app/api/connections/route.ts:GET` -> `src/lib/connections.ts:searchUsers()`.
- Model/chain: `UserProfile`; requester is the session profile, target is an arbitrary other profile.
- Observed: query `q` matches both `email` and `fullName`, then returns target profile `id`, `email`, name, headline, and photo without consulting `ConsentSetting`.
- Impact: any authenticated account can search and enumerate other profile IDs and email addresses, including email whose default consent is `private`.
- Required: search only fields eligible for directory discovery, never match or return private email, apply the Phase 1B visibility projection or a narrower directory DTO, cap input/result size, and return a stable empty/result shape.

### C2 — Connection lists bypass consent for all relationship states (High)

- Location: `src/lib/connections.ts:listConnections()` consumed by `src/app/api/connections/route.ts:GET`.
- Model/chain: `Connection -> requester/addressee UserProfile -> ConsentSetting`.
- Observed: both outgoing and incoming queries select the other profile's email and return it for accepted, pending incoming, and pending outgoing records. The Phase 1B consent projection is not called.
- Impact: a pending requester or addressee can receive a private email simply by creating/receiving a request; accepted users also receive fields regardless of stored visibility.
- Required: relationship-aware narrow DTO. Pending/declined/blocked receive public fields only; accepted receives only public plus fields explicitly visible to connections; private email is owner-only unless its stored visibility permits the viewer.

### C3 — Interview child/parent mismatch is an existence oracle (Medium)

- Location: `src/app/api/interview-sets/[id]/feedback/route.ts:POST`.
- Model/chain: `InterviewQuestion -> InterviewSet -> UserProfile`.
- Observed: the handler first loads a question by client `questionId` plus URL set ID, then returns `401 {error:"unauthorized"}` if the parent belongs to another profile, while a missing/mismatched question returns 404.
- Impact: an authenticated attacker who has candidate IDs can distinguish a valid foreign question/set pair from a nonexistent pair. Unauthorized data is loaded before ownership is established.
- Required: query the child through both parent ID and parent owner in one predicate; foreign, missing, and parent-child mismatch all return the same 404 body.

### C4 — Connection status transition exposes existence/state and has check-then-act race (Medium)

- Location: `src/app/api/connections/[id]/route.ts:PATCH`, `src/lib/connections.ts:acceptConnection()` and `declineConnection()`.
- Model/chain: `Connection.addresseeId -> UserProfile`.
- Observed: an unconstrained `findUnique(id)` produces distinct `not-found`, `not-addressee`, and `not-pending` errors, all returned as 400; a later ID-only update performs the transition.
- Impact: authenticated callers can distinguish valid connection IDs and some state/actor conditions. Concurrent requests can pass the same pending check before separate updates.
- Required: one `updateMany`/equivalent predicate on `{ id, addresseeId: actor.profileId, status:"pending" }`; count zero maps to enumeration-safe 404 unless an already-authorized second check is needed solely to return 409 for the owner's own invalid transition.

### Confirmed hardening gap — check-then-act mutations

`applications/[id]` PATCH/DELETE, `documents/[id]` DELETE, `interview-sets/[id]` DELETE, `english/submit`, and the document revision sequence authenticate ownership in one query and later mutate by ID only. The pattern is confirmed; a practical cross-user transfer exploit is not currently confirmed because public routes do not expose owner reassignment. Phase 1C still removes the TOCTOU shape as an invariant and future-proofing measure.

### Suspected risks requiring runtime confirmation

- Response timing may differ between foreign and nonexistent records on multi-query routes even when both return 404.
- Duplicate connection rows in opposite directions, corrupted cross-owner `ApplicationDocument` links, or malformed ownership rows may produce ambiguous behavior; deterministic fixture setup should create these states where schema permits.
- Caching headers for authenticated JSON/export responses have not been runtime-sampled in this planning session.
- Concurrent document revisions can compute the same `versionCount + 1`; the schema has no uniqueness constraint. Phase 1C cannot alter schema, so transaction/optimistic handling must be tested and residual risk documented.

### Not vulnerabilities in Phase 1C

- Unimplemented Opportunity, organization, moderator, restore, bulk, and upload-record features.
- Public certificate verification by `certificateId` and the consent-filtered public profile.
- Verification semantics, quota races, license redemption, and empty listening bank.

## 8. Authorization Actors

| Actor | User-owned resources | Relationship resources | Public/platform resources | Admin resources |
|---|---|---|---|---|
| Anonymous | Deny; 401 for private APIs | Deny | Consent-projected profile and public certificate only | Deny 401 |
| Authenticated owner | Own profile and descendants | Own requester/addressee view and allowed transition | Published/audience-eligible data | Deny unless current admin/owner role |
| Authenticated non-owner | Deny without confirming existence | Only fields/actions granted by relationship and consent | Same public policy | Deny 403 before target lookup |
| `admin` | Same owner-only private-resource rule | Same relationship rule | Same public policy | Existing `/api/admin/*` operations allowed |
| `owner` platform role | Same owner-only private-resource rule | Same relationship rule | Same public policy | Existing `/api/admin/*` operations allowed |
| Unknown role | Normal user scope | Normal relationship scope | Public policy | Deny 403 |
| Moderator | Not implemented; no access | Not implemented | Public policy only | Not implemented; deny |
| Organization/institution member | Not implemented; no access | Not implemented | Public policy only | Not implemented; deny |
| System/internal job | No web principal exists | No access | Question-bank scripts only | No access |

## 9. Authorization Matrix

| Resource class | Owner | Authenticated non-owner | Admin/owner role | Anonymous |
|---|---|---|---|---|
| Profile owner API and nested profile rows | C/R/U/D as exposed | 404/deny | Own profile only; no bypass | 401 |
| Document/application/interview/English attempt | C/R/U/D/X as exposed | 404 identical to missing | Own only in Phase 1C | 401 |
| Nested version/question/link | Through owned parent(s) | 404 on any mismatch | Through own parent(s) | 401 |
| Connection | View/action according to requester/addressee + status + consent | Only public directory result; otherwise 404 | Same relationship rules | 401 |
| Public profile | Phase 1B owner projection | Consent/relationship projection | Same projection | Public projection |
| Public certificate verification | Public documented subset | Public documented subset | Public documented subset | Public documented subset |
| Announcement feed | Audience eligible | Audience eligible | Includes admin audience | 401 API |
| Admin users/licenses/verification/announcements | If role is admin/owner | 403 before target lookup | Existing operation only | 401 |
| Platform question banks | Published selection only | Published selection only | Same web read | 401 API |
| AuditLog | No read route | No read route | No read route | No read route |

## 10. Security Invariants

1. Viewer identity comes only from `getSession()` and the server-side Account/Profile lookup.
2. Ownership, account ID, profile ID, role, requester ID, and audit actor are never accepted from request input.
3. Create operations derive owner/profile foreign keys from the actor context.
4. Read/update/delete operations scope the database predicate by resource locator and authorized owner/relationship.
5. Child records are authorized through their parent ownership chain; dual-parent links require both parents to be authorized to the same actor.
6. Input cannot reassign a resource to another owner or change protected foreign keys.
7. Bulk operations authorize the complete deduplicated set and mutate all-or-nothing; mixed-owner input changes nothing.
8. Export/download applies the same owner policy and a private/no-store cache policy.
9. List/search/pagination filters before retrieval and serialization; post-filtering an unauthorized superset is not sufficient.
10. Admin/elevated access is explicit, confined to existing admin routes, audited where the current model permits, and deny-by-default.
11. Missing, malformed, duplicate, corrupt, or unresolved authorization data fails closed.
12. Foreign and nonexistent private resources use the same status, message, body shape, and query shape where practical.
13. Authorization and mutation occur in the same ownership-scoped database operation or transaction where practical.
14. Client-side hiding, route layout, proxy/middleware, TypeScript types, and opaque IDs are not authorization controls.
15. Every current/future Route Handler and Server Action revalidates the production session and authorization per invocation.
16. Tests use at least two real authenticated users and production authorization code.
17. Phase 1B public-profile consent and frozen dashboard/landing behavior must not regress.

## 11. Proposed Authorization Architecture

Create one server-only module, `src/lib/authorization.ts`, rather than expanding `src/lib/auth.ts` into a policy engine.

Proposed responsibilities:

- `requireActor()` authenticates via `getSession()`, resolves the current profile once, normalizes the current role, and returns a typed `ActorContext` containing trusted `accountId`, optional `profileId`, email, and role.
- `requireCurrentAdmin(actor)` permits current `admin`/`owner` only for named admin-route operations. It does not grant private-resource access.
- Model-specific functions such as `findOwnedDocument`, `findOwnedApplication`, `findOwnedInterviewSet`, `findOwnedEnglishSession`, and `findOwnedEnglishCertificate` return an already-authorized narrow resource or a typed denial.
- Nested functions such as `findOwnedInterviewQuestion` and `findOwnedApplicationDocumentPair` encode the complete parent chain.
- Mutation functions execute an owner-scoped `updateMany`/`deleteMany` or transaction and return a typed result; they do not return a boolean followed by an unconstrained caller query.
- `authorizeConnectionTransition` executes the addressee/status-scoped transition.
- `AuthorizationError`/decision types distinguish internal reasons without exposing foreign existence. Route adapters map them to the response policy in section 15.

Helpers should return authorized data or execute the scoped operation. A generic `requireOwnership(id, session): boolean` is rejected because it encourages a second unconstrained query and cannot express nested/relationship ownership safely. Do not build a generalized RBAC/ABAC/ReBAC engine in Phase 1C.

All helpers import `server-only`. They accept only trusted `ActorContext` plus validated locator/action input. Route handlers keep request parsing and response construction; Prisma ownership predicates live in the authorization/data-access layer so the rule is not copied inconsistently.

## 12. Ownership-Scoped Prisma Patterns

Read pattern:

```ts
db.document.findFirst({
  where: { id: documentId, userProfileId: actor.profileId },
  select: requiredDocumentShape,
})
```

Create pattern:

```ts
db.application.create({
  data: { ...validatedFields, userProfileId: actor.profileId },
})
```

Atomic mutation pattern:

```ts
const result = await db.application.updateMany({
  where: { id: applicationId, userProfileId: actor.profileId },
  data: validatedMutableFields,
})
if (result.count !== 1) return NOT_FOUND
```

Use the equivalent `deleteMany` for destructive operations. If an updated record must be returned, perform the scoped mutation and scoped read inside one transaction; never fall back to `findUnique(id)` solely to distinguish foreign from missing.

Complex document revision must:

1. Do the initial owner-scoped read before the expensive LLM call.
2. After the LLM returns, open a transaction and re-read/revalidate `{documentId,userProfileId}`.
3. Derive all child foreign keys from that authorized document.
4. Create `RevisionRequest` and `DocumentVersion`, then update `Document`, inside the same transaction.
5. Detect an intervening version change using the existing `Document.version` field where possible; return 409 and do not partially write.

No schema change may add unique/version fields in Phase 1C. If SQLite/Prisma cannot guarantee the desired concurrent revision invariant with the existing schema, stop and document the precise residual risk rather than weakening authorization.

## 13. Nested Resource Policy

- `DocumentVersion` and `RevisionRequest`: authorize through `Document.userProfileId` and the URL document ID. Client child IDs never select a different parent.
- `InterviewQuestion`: query by question ID **and** URL set ID **and** `interviewSet.userProfileId`. The foreign parent must never be loaded into application memory first.
- `ApplicationDocument`: authorize both `Application.userProfileId` and `Document.userProfileId` against the same actor. Crossed A/B IDs return generic 404 and create/delete nothing.
- Profile children: owner is always the current profile. Current replace-all semantics may remain, but request-provided `id`/`userProfileId` fields are rejected or ignored under a documented strict schema.
- `EnglishCertificate`: creation requires an already-authorized `EnglishSession`; `userProfileId` is derived from the actor, never copied from the session body.
- `Connection`: requester/addressee are relationship actors, not interchangeable owners. Only the session profile may be requester; only the pending addressee may accept/decline.
- Cascades do not replace authorization. Authorize the parent before relying on Prisma cascade deletion.

## 14. Admin and Elevated Access Policy

Phase 1C preserves `isAdminRole(role)` only at the four current admin route groups:

- `/api/admin/users`
- `/api/admin/verification`
- `/api/admin/licenses`
- `/api/admin/announcements`

The role check must happen before any client-supplied target is queried. Non-admin returns 403 with the same body regardless of target validity. Admin target IDs are command operands, not caller identity. Mutations continue to validate allowlisted fields and write existing audit records where valid.

No admin/owner override is added to document, application, interview, English, profile export, connection, or private certificate routes. No moderator behavior is added. The existing broad admin role is a known temporary dependency on Phase 1D/4A, not a reason to widen Phase 1C.

Audit logging remains minimal and in existing tables. Phase 1C must not create a new audit model or private-access logging system. Failed authorization logs, if added, must use constant event names and avoid raw cookies, secrets, body payloads, foreign resource IDs, or private existence signals.

## 15. Error and Enumeration Policy

| Condition | Status | Stable response | Notes |
|---|---:|---|---|
| Missing/invalid session on private API | 401 | `{ "error": "unauthorized" }` | No resource query |
| Authenticated non-owner private resource | 404 | `{ "error": "not-found" }` | Same as missing resource |
| Missing private resource | 404 | `{ "error": "not-found" }` | Same query and shape as foreign |
| Malformed locator | 400 | `{ "error": "invalid-id" }` | Validate syntax/length before DB; no existence detail |
| Invalid JSON/body/schema/action | 400 | `{ "error": "invalid-body" }` or stable field-neutral code | Do not echo payload |
| Admin route, authenticated wrong role | 403 | `{ "error": "forbidden" }` | Evaluate before target lookup |
| Parent-child mismatch | 404 | `{ "error": "not-found" }` | Same as foreign/missing |
| Mixed-owner bulk input | 404 | `{ "error": "not-found" }` | All-or-nothing; no offending ID/index |
| Duplicate IDs or valid actor-owned state conflict | 409 | `{ "error": "conflict" }` | Only after authorization; no foreign state detail |
| Concurrent version/status conflict | 409 | `{ "error": "conflict" }` | No partial mutation |

400 is for syntax/shape, 401 for authentication, 403 for role denial on a known protected operation before resource resolution, 404 for private resource denial/missing/mismatch, and 409 for an authorized request whose current state conflicts. Do not use 403 for foreign private resources.

Response length, keys, content type, and cache headers must match for foreign and missing cases. Single scoped queries reduce avoidable timing differences; runtime tests compare coarse timing distributions but must not claim perfect constant time.

## 16. Cache, Export, Download, and Bulk-Operation Policy

- Authenticated owner/list/search/API responses must not use `use cache`, `unstable_cache`, ISR, `force-static`, or a shared CDN cache.
- Sensitive JSON and generated download responses set `Cache-Control: private, no-store` (or the established equivalent) and do not include foreign locators in filenames/errors.
- Every typed document export calls the same authorized document loader as normal reads and includes the expected `Document.type` predicate.
- Profile export remains session-profile-only. Deck export has no persisted target ID and uses only the actor profile.
- Public profile remains `force-dynamic` and Phase 1B-projected. Public certificate verification remains its separately documented public policy; it must not expose `userProfileId`, session ID, storage path/URL, or internal row ID.
- No bulk route exists today. Any bulk helper introduced for implementation/testing must deduplicate, validate all IDs, authorize the full set, and mutate within one transaction. Partial success is prohibited.
- Search filters ownership/visibility in the database before serialization. Pagination cursor/count must use the same filter so totals and next-page behavior do not leak hidden rows.

## 17. Automated Test Matrix

Deterministic fixtures:

- Account/Profile A owns Application A, Documents A (each persisted type), InterviewSet A + Question A, EnglishSession A + Certificate A, nested versions/revisions, and Connection records.
- Account/Profile B owns parallel Resource B fixtures.
- Admin C and ordinary/unknown-role D exercise elevated denial/allow policy.
- Anonymous has no session.
- Fixture values use unmistakable cross-user canaries and a temporary SQLite database; no developer DB data.

Core matrix:

| Route group | Owner positive | Cross-user read/update/delete | Export/download | Parent-child mismatch | Anonymous | Admin policy | Expected denial |
|---|---|---|---|---|---|---|---|
| Documents list/detail/delete/revise/versions | A succeeds on A | A attacks B in every supported verb | A export A succeeds; A export B denied | B version/document ID with A parent denied | 401 | Admin C has no bypass | 404 stable body |
| Applications + links | A CRUD A | A PATCH/DELETE B denied | N/A | App A + Doc B and App B + Doc A denied; no link changes | 401 | No bypass | 404; duplicate owned link 409 |
| Interview sets/questions | A R/D/feedback A | A reads/deletes/answers B denied | N/A | Set A + Question B and reverse denied | 401 | No bypass | 404 identical missing/foreign |
| English sessions/certificates | A submit/certify/read A | A submits/certifies/reads B denied | Private cert view B denied | Session B cannot mint Certificate A | 401 | No bypass | 404 |
| Profile + children/privacy/export | A owns all created rows | A-supplied B IDs/owner fields ignored or rejected; B unchanged | A export contains only A | Nested owner reassignment rejected | 401 | No bypass | 400 invalid body or owner-scoped success without reassignment |
| Connections list/search/request/status | Consent-eligible A fields only | No private B email/hidden fields; A cannot transition B/C connection | N/A | Foreign connection ID/status pair denied | 401 | Same relationship rule | 404 foreign; 409 authorized state conflict |
| Admin routes | Admin C allowed per current endpoint | User A and unknown role D denied | Admin list only as designed | Invalid target evaluated only after admin check | 401 | C allow; A/D 403 | Stable 403 |
| Public profile/certificate | Existing public behavior | Private canaries absent | Public documented subset only | N/A | Allowed public | Same public output | 404 only for missing locator |

Every relevant dynamic route requires at least:

- Positive owner request.
- User A attacking Resource B and User B attacking Resource A.
- Malformed and nonexistent ID.
- Anonymous request.
- Admin/owner-role request under the temporary no-bypass policy.
- Foreign owner/account/profile fields in JSON.
- Foreign export/download attempt where applicable.
- Delete of a foreign resource.
- Parent A + child B and parent B + child A where nested.
- Duplicate/ambiguous rows where schema permits.

Mutation tests assert both the response and database state: foreign rows unchanged, owned rows changed exactly once, no orphan child, and no partial bulk/link/revision write. Tests import/call production authorization functions and run route/runtime requests through production handlers. They must not mock the authorization helper as the only assertion.

## 18. Runtime and API Verification Plan

1. Create a fresh temporary SQLite database and apply the unchanged Prisma schema.
2. Seed deterministic A, B, admin C, and unknown-role D fixtures.
3. Start the production-compatible Next.js server with a test-only `AUTH_SECRET` and database URL.
4. Obtain real signed cookie sessions through the normal login API for A, B, and C; keep separate cookie jars.
5. Execute the matrix with raw HTTP requests so proxy, handler, session, response shape, headers, and serialization are all exercised.
6. Compare foreign vs nonexistent status/body/header shapes and coarse timing samples.
7. Inspect the temporary database after mutations and concurrent requests.
8. Verify private canaries are absent from JSON, downloads, HTML/RSC, headers, filenames, console output, and server logs.
9. Run Playwright against existing owner journeys for documents, applications, interview, English certificates, connections, and admin tabs. Dashboard and landing are smoke-tested only and must remain unchanged.
10. Repeat production build and test gates from the validation section.

## 19. Implementation Waves

Use five reviewable local commits and do not squash them into one opaque commit. No commit is created during planning except the requested planning-document commit.

### Wave A — Authorization foundation and fixtures

- Targets: new `src/lib/authorization.ts`; `src/lib/auth.ts` only for minimal integration if unavoidable; `tests/authorization/fixtures.ts`; `tests/authorization/helpers.test.ts`; route-test harness.
- Tests: actor derivation, role normalization, typed decisions, owner loaders, nested loaders, malformed IDs, foreign/missing equivalence.
- Checkpoint: helper tests use real temporary Prisma data and production code.
- Stop: any helper needs schema changes, broad admin bypass, or a generalized policy engine.
- Rollback: new module/tests are isolated; no route behavior changes yet.

### Wave B — Highest-risk mutations and deletes

- Targets: applications `[id]`; documents `[id]` and revise; interview sets `[id]` and feedback; English submit/certificate creation; `src/lib/connections.ts` transition helpers; corresponding route tests.
- Tests: cross-user U/D, foreign nested question, ownership reassignment, concurrent status/revision, rollback of partial writes.
- Checkpoint: every mutation predicate includes owner/relationship or rechecks inside its transaction.
- Stop: any write can occur after a failed/ambiguous authorization decision.
- Rollback: commit per coherent route group; revert without schema migration.

### Wave C — Reads, lists, search, exports, and downloads

- Targets: document/application/interview/English lists and detail handlers/pages; four document exports, deck/profile export, private certificate route; connections search/list DTO.
- Tests: cross-user reads/exports, pagination/search enumeration, consent states, private/no-store headers, public-route regressions.
- Checkpoint: no unauthorized canary appears in response payload or generated artifact.
- Stop: fixing search requires inventing Universal Search or new consent fields; escalate rather than redesign.
- Rollback: route/DTO changes are independently revertible.

### Wave D — Nested resources and bulk-safe primitives

- Targets: application-document links, document versions/revisions, interview questions, profile child replacement, any shared set-authorization utility. No new public bulk feature.
- Tests: parent A/child B in both directions, duplicate IDs, corrupted link fixtures, all-or-nothing helper behavior.
- Checkpoint: every child path proves authorization through all required parents.
- Stop: a nested invariant cannot be expressed without schema changes.
- Rollback: no migration; revert nested helper/route commit.

### Wave E — Admin exceptions and complete regression

- Targets: four `/api/admin/*` groups for explicit helper consumption; proxy/auth regression; all tests and runtime/browser verification; documentation/worklog update by the implementer.
- Tests: admin allowed only on existing admin endpoints; user/unknown role 403; admin denied private user-resource bypass; public profile/certificate regression.
- Checkpoint: full typecheck, lint, tests, build, API matrix, Playwright, diff/secret review.
- Stop: any dashboard/landing change, role redesign, Phase 1D behavior, unresolved cross-user access, or unexplained regression.
- Rollback: final admin integration commit can be reverted independently; earlier owner closure remains intact.

## 20. Expected Files to Change

Expected implementation files, subject to the ambiguity rule:

- New: `src/lib/authorization.ts`.
- Possibly minimal: `src/lib/auth.ts` (session integration only, no role redesign).
- `src/lib/connections.ts`.
- Owner/profile routes: `src/app/api/profile/route.ts`, `src/app/api/profile/privacy/route.ts`, `src/app/api/export/route.ts`.
- Applications routes: `src/app/api/applications/route.ts`, `[id]/route.ts`, `[id]/documents/route.ts`.
- Documents routes: `src/app/api/documents/route.ts`, `[id]/route.ts`, `[id]/versions/route.ts`, `[id]/revise/route.ts`, four generate routes, four typed export routes, deck export, essay probe only if common parsing requires it.
- Interview routes: `src/app/api/interview-sets/route.ts`, `[id]/route.ts`, `[id]/feedback/route.ts`.
- English routes: generate, submit, certificates list/create, and certificate `[id]`.
- Connection routes: collection GET/POST and `[id]` PATCH.
- Admin routes: users, verification, licenses, announcements only for explicit current-role helper adoption.
- Dynamic owner pages only if needed to consume the shared loader: four persisted document detail pages, interview detail, and private certificate detail.
- New tests under `tests/authorization/` or the repository's chosen Bun-compatible equivalent.
- `worklog.md` and current-state docs only during implementation, following the repository convention; not during this planning session.

Must not change: `prisma/schema.prisma`, dashboard, landing page, lockfile, generated Graphify output, role strings/model, or unrelated product code.

## 21. Explicitly Excluded Scope

- Phase 1D role-model redesign, moderator, scoped permissions, and owner bootstrap.
- Verification semantics or evidence redesign.
- Entitlement atomicity, quota ledger, and license redemption redesign.
- Listening-bank population.
- Dashboard or landing-page redesign and visual polish.
- Prisma schema changes or unrelated schema expansion.
- New product features, restore endpoints, public bulk APIs, or upload systems.
- Institution/organization systems not currently implemented.
- Generalized policy engines beyond the concrete Phase 1C resource helpers.
- Universal Search, opportunity records, messaging, moderation, private-data access log redesign, MFA, CSRF, or rate-limit projects.

## 22. Validation Commands

Baseline and scope:

```powershell
git status --short --branch
git rev-parse HEAD
git diff --name-only 0014427d7ff3966b2ce4e3c7c8358740034770af
git diff --check
git diff --cached --name-only
```

Graph/source inventory:

```powershell
graphify update .
graphify query "ownership authorization resource routes Prisma parent child" --budget 3500
rg --files src/app/api -g route.ts
rg -n '^export async function (GET|POST|PUT|PATCH|DELETE)' src/app/api -g route.ts
rg -n 'use server' src -g '*.ts' -g '*.tsx'
rg -n '\bdb\.' src/app src/lib -g '*.ts' -g '*.tsx'
```

Implementation quality gates:

```powershell
$env:DATABASE_URL='file:D:/laras-phase1c-test.db'; bunx prisma validate
bunx prisma generate
bunx tsc --noEmit --pretty false
bun run lint
bun test
bun run build
```

Runtime verification uses the fixture-specific server/cookie-jar script added in Wave A, followed by Playwright smoke/regression runs. The implementer must record exact commands, exit codes, fixture database path, and canary-search results in `worklog.md`.

Before each implementation commit:

```powershell
git diff --check
git status --short
git diff --cached --stat
git diff --cached
```

No push command is permitted.

## 23. Acceptance Criteria

- All 27 Prisma models are classified as owner-, relationship-, admin-, public-, platform-, or currently unreachable resources.
- All 54 database-backed handlers and relevant ID-based Server Components have an explicit policy.
- No current Server Action is missed; future actions must use the same boundary.
- User A cannot read, mutate, delete, link, revise, answer, export, or enumerate User B's private resources, and vice versa.
- Anonymous access to private APIs is 401.
- Foreign, missing, and parent-child-mismatched private resource locators are indistinguishable at the documented API level.
- Owner/profile/role foreign keys are session-derived and cannot be reassigned through request input.
- Connection list/search respects consent and relationship state and does not expose private email/profile data.
- Mutation authorization is ownership-scoped in the same database operation/transaction where practical; no check-then-ID-only-write remains on Phase 1C routes.
- Nested and mixed-owner operations are all-or-nothing.
- Export/download policy matches normal read policy and uses private/no-store caching.
- Existing admin endpoints remain explicit; admin/owner receives no new private-user-resource bypass.
- Production authorization code is exercised with A/B/admin/anonymous fixtures; authorization is not merely mocked.
- Phase 1B public-profile tests remain green; public certificate behavior remains intentionally narrow.
- Typecheck, lint, tests, production build, API/runtime matrix, browser regressions, diff check, and secret/scope review pass.
- No Prisma schema, dashboard, landing, lockfile, generated artifact, Graphify artifact, Phase 1D behavior, or unrelated feature changes.

## 24. Known Dependencies and Deferred Risks

- Phase 1D must define the final owner/admin/moderator model and secure bootstrap. Phase 4A must replace broad role strings with scoped permissions.
- The current schema has no unique constraint on `(documentId, versionNumber)`; concurrent revision safety may remain limited without a future schema phase. Phase 1C must still minimize and test the race.
- `Connection` permits opposite-direction duplicate rows. Phase 1C fails closed and tests ambiguity but does not change schema.
- `AuditLog` has no system actor and admin announcement logging can be silently lost. Audit redesign is deferred.
- Public certificate verification intentionally discloses recipient name and score to holders of the verification code. Any policy redesign is separate from IDOR closure.
- Search visibility is currently shallow. Phase 1C may make the connection directory conservative; it must not invent Universal Search.
- No first-class upload/export records exist, so storage-object authorization cannot be fully modeled in Phase 1C. Any newly discovered signed/public storage URL leakage is a stop-and-escalate issue.
- CSRF, MFA, session assurance, rate limiting, entitlement quota races, and verification trust semantics remain separate security work.

## 25. Implementer Handoff

- **Implementation model:** Gemini 3.5 Flash.
- **Starting commit:** `0014427d7ff3966b2ce4e3c7c8358740034770af`.
- **Implement:** Waves A through E in order, using the target files and tests listed in sections 19 and 20.
- **Commit model:** several small, reviewable local commits; keep a squash-free history. Do not push.
- **Rules that may not be redesigned:** custom JWT cookie session, current three role strings, `isAdminRole` compatibility on existing admin routes, Prisma schema, Phase 1B public-profile projection/consent matrix, public certificate intent, entitlement/license semantics, dashboard, landing page, and product scope.
- **Authorization rule:** trusted session identity only; no blanket admin bypass to private resources; owner/relationship predicates execute in the data operation or transaction.
- **Ambiguity escalation:** stop before coding the ambiguous surface if legitimate sharing, admin private-data access, storage ownership, bulk semantics, or concurrency cannot be resolved from current source and this plan. Record path, handler, model/chain, competing policies, and the smallest decision needed from the owner. Do not guess.
- **Required stop condition:** stop immediately on branch/HEAD drift, unexplained tracked changes, required schema change, dashboard/landing impact, Phase 1D dependency, inability to preserve enumeration-safe behavior, or any failing cross-user/security gate that cannot be fixed within Phase 1C.
- **Completion stop:** when all Phase 1C acceptance criteria pass, update the implementation worklog/docs, inspect full/staged diffs, commit locally, report SHAs and verification, and stop.
- **Push:** prohibited.
- **Phase 1D:** prohibited.
