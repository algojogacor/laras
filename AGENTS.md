# AGENTS.md — Laras Project Architecture & Rules

## Product

Laras is an **Indonesia-first Career Operating System and Professional Growth Network** — a deeply integrated ecosystem connecting identity, evidence, readiness, learning, opportunities, people, communities, institutions, and trusted career outcomes.

## Technical Architecture

- **Framework**: Next.js 16 App Router with Turbopack
- **Language**: TypeScript strict
- **Data layer**: Prisma 6 with SQLite (local) / Turso libSQL (production)
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York style)
- **Auth**: Custom JWT (jose) + bcryptjs, httpOnly cookie (laras_session, 30-day)
- **AI**: z-ai-web-dev-sdk (ZAI.create())
- **Storage**: Supabase Storage for audio/files
- **Runtime**: Bun (dev + production)
- **i18n**: ID/EN bilingual via cookie (laras_locale) + shared dictionary

## Directory Map

```
src/
  app/
    (app)/          — authenticated routes (dashboard, profile, documents, etc.)
    (auth)/         — login, signup
    api/            — 42+ API route handlers
    u/[profileId]/  — public profile (consent-filtered)
    verify/         — certificate verification
  components/
    ui/             — 50 shadcn/ui components
    admin/          — admin panel (tabs, verification, licenses)
    auth/           — login/signup form
    dashboard/      — readiness ring, completeness, timeline, suggestions
    documents/      — CV, cover letter, bio, essay builders/viewers
    interview/      — interview practice Q&A
    english/        — English practice hub
    profile/        — profile editor, privacy panel
    connections/    — connection list, search
    onboarding/     — onboarding wizard
    settings/       — settings, license card
    shared/         — notification-list, shared components
    site/           — app-header, site-header, footer, logo, command-palette
    providers/      — theme, locale providers
  lib/
    auth.ts         — JWT sessions, password hashing, cookie management
    authorization.ts — 4-role model, requireActor, owner-scoped loaders
    db.ts           — Prisma singleton with Turso adapter
    public-profile.ts — consent-enforced DTO projection
    connections.ts  — connection request/accept/decline logic
    evidence.ts     — Evidence CRUD with ownership
    activity.ts     — ActivityEvent emission
    notifications.ts — notification store, read state, count
    opportunities.ts — Opportunity CRUD
    quota-ledger.ts — atomic idempotent quota consumption
    entitlement.ts  — plan/license entitlement resolution
    privacy.ts      — consent settings
    verification.ts — verification badges
    readiness.ts    — profile breakdown + readiness scoring
    content-engine.ts — AI generation engine
    rate-limit.ts   — in-memory sliding window rate limiter
    supabase.ts     — Supabase Storage client
    i18n/           — dictionary (ID+EN), locale detection
    ...
prisma/
  schema.prisma     — 30+ models (see below)
tests/
  authorization/    — 10 test files, 258 tests
scripts/
  bootstrap-owner.ts — secure first-owner CLI
```

## Prisma Models (30+)

Account, UserProfile, Experience, Education, Skill, Certification, LanguageProficiency,
Application, Document, DocumentVersion, RevisionRequest, ApplicationDocument,
InterviewSet, InterviewQuestion, Essay, EnglishSession, ListeningQuestion,
ReadingQuestion, StructureQuestion, EnglishCertificate, Achievement,
Evidence, ActivityEvent, Notification, AnnouncementRead, Opportunity,
QuotaLedger, LicenseCode, AuditLog, VerificationBadge, License,
ConsentSetting, Connection, Announcement

## Commands

```bash
bun run dev              # Next.js dev server on port 3000
bun run build            # Production build (standalone output)
bun run lint             # ESLint
bun test                 # Run all tests (bun:test)
bunx tsc --noEmit        # TypeScript typecheck
bunx prisma db push      # Sync schema to database
bun run bootstrap:owner  # Secure first-owner creation
bun run listening:generate # Generate listening bank
```

## Security Rules

1. All API routes MUST call `requireActor()` before any data access
2. All resource access MUST scope to `userProfileId` from session (never from request body)
3. Foreign resources return 404 (indistinguishable from missing)
4. Admin/owner receive NO automatic override for private user resources
5. Roles: owner > admin > moderator > user (fail-closed normalization)
6. JWT carries NO role claim — role reloaded from DB each request
7. Use `safeNextResponse()` for all authenticated JSON responses (Cache-Control: private, no-store)
8. Never trust client-supplied IDs for ownership decisions
9. No secrets in code, commits, or API responses

## Migration Rules

1. Pre-production: use `prisma db push` (no migration history needed)
2. Before any destructive DB operation: verify local/dev, record in worklog.md
3. Schema must be Turso/libSQL compatible (no enums, no arrays)
4. Every new model needs: indexes, uniqueness review, ownership boundary
5. Schema changes need: push, generate, test verification

## Localization Rules

1. All UI strings in `src/lib/i18n/dictionary.ts` (ID + EN)
2. Never hardcode user-visible strings in components
3. Locale via `laras_locale` cookie for SSR/CSR consistency
4. Server: `getLocaleAndDict()`, Client: `useT()`

## Git Rules

1. Branch: `main` local → push to `origin/upgrade/laras-100x`
2. NEVER push to `origin/main`, NEVER force-push, NEVER rewrite history
3. Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `security:`
4. Before commit: inspect diff, run tests + typecheck + lint
5. After commit: push immediately
6. NEVER commit: .env, secrets, tokens, passwords, user data

## Prohibited Actions

- git reset --hard / git clean
- Force push / rewrite history
- Push to main remote
- Commit secrets or .env files
- Expose env var values in logs
- Use "Coming Soon" placeholders

## Definition of Done (35 criteria from MASTER_PROMPT.md §37)

A feature is complete only when ALL 35 criteria are satisfied:
user problem explicit, value clear, discoverable, workflow works, data persists,
authorization server-side, entitlement enforced, loading/empty/error/success states,
mobile + desktop, ID + EN, light + dark, keyboard + accessibility,
privacy respected, abuse handled, admin/mod/user controls, audit trail,
integration, automated tests, browser QA, build passes, docs current,
obsolete code removed, adversarial review, committed, pushed.
