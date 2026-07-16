# Laras — Environment Setup

Last updated: 2026-07-16

## Quick Start (Local Development)

```bash
# 1. Copy the example env file
cp .env.example .env

# 2. The default .env.example works for local dev out of the box:
#    - DATABASE_URL=file:./db/laras.db (local SQLite, zero config)
#    - AUTH_SECRET=dev-auth-secret-do-not-use-in-production-32bytes
#    - AI and Supabase are optional — see sections below

# 3. Install and run
bun install
bunx prisma generate
bunx prisma db push
bun run dev
```

The app starts at `http://localhost:3000`.

---

## Environment Variable Reference

### Required — App Will Not Start Without These

| Variable | Purpose | Format | Example |
|---|---|---|---|
| `DATABASE_URL` | Database connection | `file:./path` or `libsql://host` | `file:./db/laras.db` |
| `AUTH_SECRET` | JWT signing key (≥32 chars) | Random base64 string | `openssl rand -base64 32` |

### Database — Turso/libSQL (Production)

| Variable | Required | Purpose |
|---|---|---|
| `TURSO_DATABASE_URL` | Only if using Turso | Alternative to `DATABASE_URL` for Turso |
| `TURSO_AUTH_TOKEN` | Only if using Turso | Turso authentication token |

When `DATABASE_URL` starts with `libsql://`, the libSQL adapter is used automatically.
For local development, use `DATABASE_URL=file:./db/laras.db` and skip Turso variables.

### AI — DeepSeek V4 Pro

| Variable | Required | Purpose |
|---|---|---|
| `DEEPSEEK_API_KEY` | For AI features | DeepSeek API key from https://platform.deepseek.com/ |
| `DEEPSEEK_BASE_URL` | Optional | Override default `https://api.deepseek.com` |

**AI features affected when `DEEPSEEK_API_KEY` is missing:**
- CV/ATS generation
- Cover letter generation
- Professional bio generation
- Essay generation (scholarship, motivation letter, personal statement)
- Interview question generation and feedback
- English reading practice generation
- English structure/grammar practice generation
- English listening script generation
- Application/job description summarization
- Document revision

Non-AI workflows (profile editing, connections, circles, etc.) work normally without it.

### Supabase Storage — File Uploads

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | For uploads | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | For browser reads | Publishable/anon key (safe for browser) |
| `SUPABASE_SECRET_KEY` | For server uploads | Secret/service-role key (server only) |

**Alternative names accepted:**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — fallback for publishable key
- `SUPABASE_SERVICE_ROLE_KEY` — fallback for secret key

**Features affected when Supabase is not configured:**
- Profile photo uploads
- Document exports (PDF, PPTX, DOCX)
- Listening audio storage (falls back to local `/public/audio/`)
- Deck exports

When Supabase is not configured, uploads fail gracefully with user-facing errors.

### Owner Bootstrap — CLI Only

| Variable | Required | Purpose |
|---|---|---|
| `BOOTSTRAP_SECRET` | For bootstrap | Secret for `bun run bootstrap:owner` (≥32 chars) |
| `OWNER_EMAIL` | For bootstrap | Email of the account to promote to owner |

Usage:
```bash
BOOTSTRAP_SECRET=<secure-secret> OWNER_EMAIL=admin@example.com bun run bootstrap:owner
```

Requirements:
- `BOOTSTRAP_SECRET` must be ≥ 32 characters
- `BOOTSTRAP_SECRET` must NOT equal `AUTH_SECRET`
- `OWNER_EMAIL` must match an existing registered account
- Can only run once (fails if owner already exists)
- This is a CLI script — NOT an HTTP endpoint

---

## Production / Koyeb Setup

### Minimum Production Variables

```env
DATABASE_URL=libsql://<your-db>.turso.io
TURSO_AUTH_TOKEN=<turso-token>
AUTH_SECRET=<strong-random-secret>
DEEPSEEK_API_KEY=<your-deepseek-key>
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SECRET_KEY=<secret-key>
```

### Koyeb 512 MB Considerations

- The app runs as a standalone Next.js server (`output: "standalone"`)
- In-memory rate limiting (no Redis needed)
- edge-tts uses Python subprocess (ensure Python 3 is in the container)
- Supabase Storage handles file persistence (no local disk reliance)
- AI requests have 120s timeout with 2 retries — monitor for timeouts under load

### Dockerfile Notes

The existing `Dockerfile` uses `oven/bun:1` multi-stage build.
Add environment variables via Koyeb secrets or `--env` flags:

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=libsql://... \
  -e TURSO_AUTH_TOKEN=... \
  -e AUTH_SECRET=... \
  -e DEEPSEEK_API_KEY=... \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
  -e SUPABASE_SECRET_KEY=... \
  laras
```

---

## Turso Setup

1. Create a database at https://turso.tech
2. Get the connection URL: `libsql://<db-name>-<org>.turso.io`
3. Create an auth token: `turso db tokens create <db-name>`
4. Set in `.env`:
   ```env
   DATABASE_URL=libsql://<db-name>-<org>.turso.io
   TURSO_AUTH_TOKEN=<token>
   ```
5. Run migrations: `bunx prisma db push`

For local dev, skip Turso entirely — use `DATABASE_URL=file:./db/laras.db`.

---

## Supabase Setup

1. Create a project at https://supabase.com
2. Go to Project Settings → API
3. Copy the Project URL and keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon-key>
   SUPABASE_SECRET_KEY=<service-role-key>
   ```
4. Create storage buckets (the app attempts idempotent creation):
   - `listening-audio` (public)
   - `generated-documents` (private)
   - `user-exports` (private)
   - `deck-exports` (private)
   - `pdf-exports` (private)
   - `profile-photos` (private)

---

## DeepSeek AI Setup

1. Sign up at https://platform.deepseek.com/
2. Create an API key
3. Set in `.env`:
   ```env
   DEEPSEEK_API_KEY=sk-...
   ```
4. The app uses `deepseek-v4-pro` exclusively
5. Test with any AI feature after registering and completing onboarding

---

## Owner Bootstrap Instructions

After deploying, create the first owner account:

1. Register a normal account through the signup page
2. Run the bootstrap script:
   ```bash
   BOOTSTRAP_SECRET=$(openssl rand -base64 32) OWNER_EMAIL=you@example.com bun run bootstrap:owner
   ```
3. The account is promoted to `owner` role
4. Owner has full access to admin dashboard and all moderation controls

---

## Troubleshooting

### "AUTH_SECRET is not set"
→ Add `AUTH_SECRET` to `.env`. Generate with `openssl rand -base64 32`.

### "DATABASE_URL is not set"
→ Add `DATABASE_URL=file:./db/laras.db` for local dev.

### AI features return errors
→ Check `DEEPSEEK_API_KEY` is set and valid.
→ Verify at https://platform.deepseek.com/ that your key is active.
→ The app fails safely — no data is lost.

### File uploads fail
→ Check Supabase variables are set.
→ Verify buckets exist (the app attempts to create them automatically).
→ For local dev without Supabase, uploads return graceful errors.

### Turso connection fails
→ Verify `TURSO_AUTH_TOKEN` matches the database.
→ Try `bun run scripts/verify-turso.ts` to test connectivity.
→ For local dev, use `DATABASE_URL=file:./db/laras.db` instead.

### "Missing required environment variables"
→ Run `bun run dev` — the startup validation (in `src/instrumentation.ts`) will
  tell you exactly which required variables are missing.

### Windows: `prisma generate` fails with `EPERM` on `query_engine-windows.dll.node`
→ Stop only Laras processes that may hold the Prisma engine: Next/Bun test/dev
  processes for this repository. Do not delete unrelated processes or files.
→ Run `bunx prisma generate` again, then `bunx prisma validate`.
→ If the rename is still blocked, close IDE terminals using this repository and
  check antivirus/file-indexing locks before retrying. The generated engine must
  be available before starting Next.js.

### Password reset testing in local development
→ Reset requests always return a generic success response to prevent account
  enumeration. Set `RESET_TOKEN_DEV_OUTPUT=true` only in a private local
  environment when a test client needs the one-time token in the response.
→ Reset tokens are persisted hashed, expire after one hour, and are consumed
  atomically with the password/session-version update.

---

## CI/CD (GitHub Actions)

The CI workflow (`.github/workflows/ci.yml`) sets:
- `DATABASE_URL=file:./dev.db` — local SQLite for tests
- `AUTH_SECRET=ci-test-auth-secret-key-at-least-32-chars` — test-only secret

AI and Supabase tests are skipped in CI (no live credentials).
DeepSeek provider unit tests work without a live API key.
