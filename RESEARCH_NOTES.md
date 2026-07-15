# RESEARCH_NOTES.md — Laras 100X Research & Decisions

## R1. Turso/libSQL Compatibility
- **Question**: Can the Prisma schema work with Turso/libSQL in production?
- **Sources**: Turso docs, Prisma libSQL adapter docs, schema.prisma
- **Findings**: Schema uses no enums, no arrays — fully compatible. `driverAdapters` preview feature handles the translation layer. Local SQLite works identically.
- **Adopted**: Keep SQLite-native schema. Use `prisma db push` for pre-production.
- **Rejected**: PostgreSQL-only features (native enums, arrays, full-text search).
- **Reason**: Turso is the approved production database; schema must stay compatible.

## R2. Next.js Middleware vs Layout Guards
- **Question**: Should route protection use middleware or layout-level auth checks?
- **Sources**: Next.js 16 docs, current codebase
- **Findings**: The project uses layout-level auth (`(app)/layout.tsx` checks getSession()) plus per-route API checks. No middleware.ts exists. `proxy.ts` exists but is dead code.
- **Adopted**: Keep current dual approach (layout for pages, per-route for APIs). Middleware evaluated as future enhancement for global security headers and CSRF.
- **Rejected**: Moving all auth to middleware — would add latency to every request including static assets.
- **Reason**: Per-route checks are more explicit and auditable. Middleware adds overhead for non-API routes.

## R3. Quota Ledger Atomicity
- **Question**: How to make entitlement consumption atomic and idempotent?
- **Sources**: Prisma transaction docs, SQLite concurrency behavior
- **Findings**: SQLite serializes writes per connection. Using `$transaction` with a unique `idempotencyKey` (scoped to user) provides atomicity. Count-then-create race conditions are prevented by the unique constraint.
- **Adopted**: `QuotaLedger` model with `@@unique([userProfileId, idempotencyKey])`. `consumeQuota()` uses `$transaction` with findUnique-then-create.
- **Rejected**: Redis-based distributed locking (not needed for pre-production single-instance).
- **Reason**: Simple, works with SQLite/Turso, no external dependency needed.

## R4. Password Reset Without Email Service
- **Question**: How to implement password reset without an email delivery service?
- **Sources**: OWASP password reset guidance, crypto.randomBytes
- **Findings**: In pre-production without email, we can generate reset tokens and log them to console (dev) or return them directly in a secure manner. Production would need an email provider (Resend, SendGrid).
- **Adopted**: Token-based reset with `crypto.randomBytes(32).toString('hex')`, 1-hour expiry, anti-enumeration (always return 200 on request).
- **Rejected**: SMS-based reset (no phone infrastructure), security questions (insecure).
- **Reason**: Simplest secure approach for pre-production. Email integration is deferred.

## R5. Security Headers
- **Question**: What security headers should Laras use?
- **Sources**: OWASP Secure Headers Project, Next.js headers config, Mozilla Observatory
- **Findings**: Baseline: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, Strict-Transport-Security. CSP requires careful tuning per page and is deferred.
- **Adopted**: Six baseline headers via `next.config.ts` headers(). CSP deferred to production hardening.
- **Rejected**: CSP with `'unsafe-inline'` (defeats purpose). Full CSP requires nonce-based script loading.
- **Reason**: Baseline headers provide immediate protection. CSP needs careful implementation with the existing inline scripts/styles.

## R6. Dark Mode Document Previews
- **Question**: Why do document previews render white-on-dark?
- **Sources**: Subagent E audit, component source code
- **Findings**: 8+ components use hardcoded `bg-white` (skeleton-doc.tsx, cover-letter-builder.tsx, cover-letter-viewer.tsx, cv-ats-preview.tsx, essay-builder.tsx, essay-viewer.tsx, cv-visual/templates.tsx ×4). These simulate paper but don't respect dark mode.
- **Adopted**: Replace `bg-white` with `bg-card dark:bg-card print:bg-white`. In print media, always use white background.
- **Reason**: Documents are meant to simulate paper output. In screen dark mode, use card background. In print, always white.

## R7. Koyeb 512 MB Deployment
- **Question**: Is 512 MB sufficient for Laras on Koyeb?
- **Sources**: Subagent F analysis, Bun memory benchmarks, Next.js standalone docs
- **Findings**: Estimated 170-300 MB idle, 250-400 MB under load. Bun + Next.js standalone is efficient. Document generation (docx, pptxgenjs) can spike memory temporarily. Sharp image processing uses ~50-100 MB transient.
- **Adopted**: 512 MB is adequate for light-to-moderate traffic (10-50 concurrent users). Recommend monitoring and potential bump to 1 GB for production launch. Add `Dockerfile` with Bun base image.
- **Reason**: Pre-production traffic will be minimal. Monitor and scale before public launch.
