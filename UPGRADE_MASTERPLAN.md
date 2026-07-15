# UPGRADE_MASTERPLAN.md — Laras 100X Transformation

## Verified Baseline (2026-07-15)

| Item | Status |
|------|--------|
| Current HEAD | `642c919` |
| Remote | `origin/upgrade/laras-100x` (pushed) |
| Branch | `main` (local), pushes to `upgrade/laras-100x` |
| TypeScript | 0 errors |
| Lint | 0 errors |
| Build | PASS (Next.js 16.1.3, standalone) |
| Tests | 258 pass, 0 fail, 593 assertions, 10 files |
| Prisma models | 30+ (SQLite, Turso-compatible) |
| API routes | 45+ (all ownership-enforced) |
| Pages | 29+ across 3 route groups |

## Round and Phase Status

### COMPLETED
| Phase | Description | Commit |
|-------|-------------|--------|
| 1A | Type-safety + build green | `561589c` |
| 1B | Server-side consent enforcement | `0014427` |
| 1C | Ownership authorization on all APIs | `c52c498` |
| 1D | Role model + owner bootstrap | `622051b` |
| 2A | Evidence Graph | `6f1af13` |
| 2B | Activity Event Layer | `b997655` |
| 2C | Notification Layer | `b997655` |
| 3A | Opportunity Graph | `c649443` |
| 3C | Quota Ledger (atomic) | `0d67dca` |
| 5A | License Code model (partial) | `0d67dca` |
| 8C | Announcement read/dismiss | `23a88d4` |

### IN PROGRESS (subagents dispatched)
| Phase | Description | Agent |
|-------|-------------|-------|
| 3B | Opportunity match explanation | a50e7e |
| 4A | Granular permission engine | a6b5a1 |
| 4B+4C | Moderation, reports, appeals, sanctions, suspension | a92073 |
| 5A+10 | License redemption, health check, security headers, Dockerfile, password reset | af78f5 |

### PENDING
| Phase | Description |
|-------|-------------|
| 4B | Moderation queues |
| 4C | Private-data access logging, audit viewer |
| 5B | Campaigns, dynamic config |
| 5C | Capability resolver, FREE/PLUS/PRO/MAX |
| 6A | Messaging/communication |
| 6B | Career circles, study groups, peer review |
| 6C | Mentorship |
| 7A | Organization workspaces |
| 7B | Scoped org roles |
| 7C | Institution integrations |
| 8A | Universal Search |
| 8B | Unified Inbox |
| 9A | Dashboard integration |
| 10A | Design normalization, accessibility |
| 10B | Performance optimization |
| 10C | Security hardening (MFA, CSRF, rate limits) |
| 10D | Deployment readiness (CI/CD, env validation) |

## Known Risks

| Risk | Severity | Status |
|------|----------|--------|
| 10+ routes use getSession() not requireActor() | MEDIUM | Tracked |
| No health check endpoint | HIGH | Agent af78f5 |
| No security headers | HIGH | Agent af78f5 |
| No CSRF protection (SameSite only) | MEDIUM | PENDING |
| No MFA / password reset | MEDIUM | Agent af78f5 |
| proxy.ts dead code | LOW | PENDING |
| 8+ doc previews broken in dark mode | MEDIUM | PENDING |
| 17 API routes untested | MEDIUM | PENDING |
| No browser/E2E tests | HIGH | PENDING |
| No Dockerfile | HIGH | Agent af78f5 |
| Listening bank empty (0 records) | LOW | PENDING |

## Architecture Decisions

- D1: Next.js 16 + Turbopack + TypeScript 5 + Prisma 6
- D2: shadcn/ui (New York) + Tailwind CSS 4
- D3: ID/EN bilingual via cookie + dictionary
- D4: z-ai-web-dev-sdk for AI
- D5: Git push main→upgrade/laras-100x
- D6: Custom JWT (jose) + bcrypt, not NextAuth
- D7: Phase 1B public-profile consent matrix
- D8: Phase 1D canonical 4-role model
- D9: Phase 1C deny-by-default ownership authorization

## Completion State

- Foundation phases (1A-1D): 100% complete
- Core data primitives (2A-2C): 100% complete
- Opportunity intelligence (3A): 100% complete
- Opportunity matching (3B): in progress
- Governance (4A-4C): in progress
- Entitlement (3C, 5A partial): ~60% complete
- Network (6A-6C): 0%
- Institutions (7A-7C): 0%
- Search/Inbox (8A-8B): 10% (notifications done, announcements read done)
- Dashboard (9A): 0%
- Hardening (10A-10D): ~5%
