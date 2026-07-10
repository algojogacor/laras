# Laras — Roadmap

**Dibuat:** 2026-07-10
**Status:** Post-restore, baseline QA selesai
**Prinsip prioritasi:** Impact tinggi + Confidence tinggi + Effort masuk akal + Risk terkendali

---

## NOW (P0/P1 — mendesak & berdampak tinggi)

### ROADMAP-001: Fix public certificate verification proxy bug
- **Masalah:** `/verify/certificate/[code]` didesain public tapi proxy redirect ke `/login` — fitur unggulan rusak.
- **Pengguna terdampak:** Semua orang yang menerima link verifikasi sertifikat (HR, beasiswa committee, dosen).
- **Solusi:** Tambah `/verify` ke `PUBLIC_PREFIXES` di `src/proxy.ts`.
- **Alasan prioritas:** P1, 1 line fix, impact besar pada trust feature.
- **Dampak:** 5/5
- **Effort:** 1/5 (10 menit)
- **Risiko:** Rendah (hanya menambah path ke whitelist)
- **Acceptance criteria:**
  - Buka `/verify/certificate/[code]` di incognito → halaman tampil tanpa redirect
  - Halaman lain (dashboard, documents) tetap redirect ke login jika tidak auth
- **Cara pengujian:** Browser incognito, akses URL verify, verifikasi tidak ada redirect

### ROADMAP-002: Add error boundaries + loading + not-found
- **Masalah:** Tidak ada `error.tsx`, `loading.tsx`, `not-found.tsx`, `global-error.tsx` — unhandled error = white screen.
- **Pengguna terdampak:** Semua user saat terjadi DB/LLM/network error.
- **Solusi:** Buat 4 file:
  - `src/app/global-error.tsx` (root error boundary)
  - `src/app/not-found.tsx` (branded 404)
  - `src/app/(app)/loading.tsx` (app loading skeleton)
  - `src/app/(app)/error.tsx` (app error boundary dengan retry)
- **Alasan prioritas:** P1, UX baseline, mencegah "white screen of death".
- **Dampak:** 4/5
- **Effort:** 2/5 (1-2 jam)
- **Risiko:** Rendah
- **Acceptance criteria:**
  - DB error di server component → branded error page dengan "Coba lagi" button
  - Halaman loading → skeleton bukan blank
  - URL tidak ada → branded 404 dengan link ke dashboard
- **Cara pengujian:** Putuskan DB, refresh halaman → error boundary. Akses URL random → 404.

### ROADMAP-003: Add rate limiting (auth + LLM routes)
- **Masalah:** Tidak ada rate limiter — brute-force password possible, LLM cost-abuse possible.
- **Pengguna terdampak:** Semua (security + cost protection).
- **Solusi:** Implementasi in-memory rate limiter (Map-based, per-IP + per-user). Untuk production multi-instance, bisa upgrade ke Upstash Redis.
  - `/api/auth/login`: 10 req/menit per IP
  - `/api/auth/signup`: 5 req/menit per IP
  - `/api/documents/*/generate`, `/api/english/generate`, `/api/interview-sets`, `/api/applications/summarize`: 20 req/menit per user
- **Alasan prioritas:** P1, security + cost.
- **Dampak:** 5/5
- **Effort:** 3/5 (2-3 jam)
- **Risiko:** Sedang (perlu test agar tidak block legitimate user)
- **Acceptance criteria:**
  - 11th login attempt dalam 1 menit → 429 Too Many Requests
  - 21st LLM generate dalam 1 menit → 429
  - Normal usage tidak terpengaruh
- **Cara pengujian:** Script yang hit endpoint 15x cepat → verifikasi 429 setelah threshold

### ROADMAP-004: Fix mobile navigation (AppHeader hamburger menu)
- **Masalah:** AppHeader nav links `hidden lg:flex` — mobile user tidak bisa navigasi.
- **Pengguna terdampak:** ~60%+ user mobile.
- **Solusi:** Tambah hamburger menu + Sheet/Drawer di AppHeader untuk `lg:hidden`.
- **Alasan prioritas:** P1/P2, user journey broken di mobile.
- **Dampak:** 4/5
- **Effort:** 2/5 (1-2 jam)
- **Risiko:** Rendah
- **Acceptance criteria:**
  - Di viewport < 1024px, hamburger menu muncul
  - Klik hamburger → sheet/drawer dengan nav links
  - Klik link → navigasi + tutup sheet
- **Cara pengujian:** Browser dev tools, viewport mobile, verifikasi menu

### ROADMAP-005: Remove `ignoreBuildErrors: true` after fixing type errors
- **Masalah:** 372 type errors di-mask oleh `ignoreBuildErrors: true` — bug TS bisa masuk production.
- **Pengguna terdampak:** Developer (regression risk), user (bug potensial).
- **Solusi:** 
  1. Fix 364 errors di `dictionary.ts` (relax type atau fix missing keys)
  2. Fix 8 errors di app code (db.ts, content-engine.ts, dll.)
  3. Hapus `typescript.ignoreBuildErrors` dari next.config.ts
  4. Verifikasi build masih lulus
- **Alasan prioritas:** P1, technical debt blocking.
- **Dampak:** 4/5
- **Effort:** 4/5 (3-4 jam — dictionary fix complex)
- **Risiko:** Sedang (perlu test regression)
- **Acceptance criteria:**
  - `tsc --noEmit` → 0 errors
  - `next build` → exit 0 tanpa `ignoreBuildErrors`
- **Cara pengujian:** Jalankan tsc + build

---

## NEXT (P2 — setelah NOW stabil)

### ROADMAP-006: Wire ConfigPanel to all document builders
- **Masalah:** ConfigPanel ada tapi tidak terhubung. User tidak bisa kontrol tone/length/target.
- **Pengguna terdampak:** Semua user yang generate dokumen.
- **Solusi:** Replace old config sidebars di 6 builder UI dengan ConfigPanel.
- **Dampak:** 3/5
- **Effort:** 3/5
- **Risiko:** Sedang
- **Acceptance criteria:** Semua 6 builder (CV ATS, CV Visual, Cover Letter, Bio, Essay, Deck) pakai ConfigPanel.

### ROADMAP-007: Sanitize error messages in API routes
- **Masalah:** 7 route leak `(e as Error).message` ke client.
- **Solusi:** Central error handler, generic error codes.
- **Dampak:** 3/5 (security)
- **Effort:** 2/5
- **Risiko:** Rendah

### ROADMAP-008: Add getSession() to /api/applications/summarize
- **Masalah:** Defense-in-depth violation.
- **Solusi:** Tambah `getSession()` + ownership check.
- **Dampak:** 2/5
- **Effort:** 1/5
- **Risiko:** Rendah

### ROADMAP-009: Render CommandDialog or remove
- **Masalah:** Command palette built tapi tidak render.
- **Solusi:** Wire `Cmd+K` shortcut di root layout, render CommandDialog dengan nav actions.
- **Dampak:** 3/5 (power-user feature)
- **Effort:** 2/5
- **Risiko:** Rendah

### ROADMAP-010: Scale listening bank (13 → 100+)
- **Masalah:** Bank listening hanya 13 set, user cepat habis.
- **Solusi:** Run `bun run toefl:generate 50 medium` bertahap.
- **Dampak:** 4/5 (retention)
- **Effort:** 2/5 (script sudah ada)
- **Risiko:** Rendah (LLM cost per set)

### ROADMAP-011: Remove dead dependencies (next-auth, next-intl)
- **Masalah:** Terinstall tapi tidak dipakai, bunyi package size.
- **Solusi:** `bun remove next-auth next-intl`
- **Dampak:** 1/5
- **Effort:** 1/5
- **Risiko:** Rendah

### ROADMAP-012: Add automated tests (Vitest unit + Playwright E2E)
- **Masalah:** Zero tests, regression risk tinggi.
- **Solusi:** Setup Vitest untuk pure functions (scoring, suggestions, profile), Playwright untuk happy path (signup → onboarding → generate CV).
- **Dampak:** 4/5 (long-term maintainability)
- **Effort:** 4/5
- **Risiko:** Rendah

### ROADMAP-013: Internationalize certificate pages
- **Masalah:** Hardcoded English di `/verify/certificate/[code]` dan `certificate-list.tsx`.
- **Solusi:** Pindahkan ke dictionary.
- **Dampak:** 2/5
- **Effort:** 2/5
- **Risiko:** Rendah

---

## LATER (P3 — penting tapi tidak sekarang)

### ROADMAP-014: Add "Opportunity Readiness Score"
- **Masalah:** Tidak ada composite metric untuk "seberapa siap melamar".
- **Solusi:** Score dari profile completion + document freshness + English practice + interview prep. Tampil di dashboard.
- **Dampak:** 5/5 (diferensiasi)
- **Effort:** 4/5
- **Risiko:** Sedang

### ROADMAP-015: PWA manifest + service worker
- **Masalah:** Tidak installable, tidak ada offline mode.
- **Solusi:** next-pwa atau manual manifest + Workbox.
- **Dampak:** 3/5
- **Effort:** 3/5
- **Risiko:** Sedang

### ROADMAP-016: Notification center
- **Masalah:** Deadline alerts hanya di page Applications.
- **Solusi:** NotificationCenter component + SSE/polling + Prisma Notification model.
- **Dampak:** 3/5
- **Effort:** 4/5
- **Risiko:** Sedang

### ROADMAP-017: JD → Tailored document pipeline
- **Masalah:** Generate dokumen fragmented, tidak ada "paste JD → generate all".
- **Solusi:** Wizard: paste JD → pilih dokumen (CV + cover letter + interview) → generate semua tailored.
- **Dampak:** 5/5 (killer feature)
- **Effort:** 5/5
- **Risiko:** Tinggi (LLM cost, UX complexity)

### ROADMAP-018: Voice-to-voice mock interview
- **Masalah:** Interview prep hanya text.
- **Solusi:** TTS + STT → voice interview real-time.
- **Dampak:** 4/5
- **Effort:** 5/5
- **Risiko:** Tinggi

### ROADMAP-019: Schema drift fix (add 4 missing models to Prisma)
- **Masalah:** 4 tabel di Turso (Achievement, AuditLog, ReadingQuestion, StructureQuestion) tidak ada di Prisma.
- **Solusi:** Tambahkan 4 model ke schema.prisma, run `prisma db pull` untuk sync.
- **Dampak:** 3/5 (data integrity)
- **Effort:** 2/5
- **Risiko:** Sedang (perlu verify tidak break existing query)

### ROADMAP-020: Accessibility improvements
- **Masalah:** Tidak ada skip-link, aria-current, prefers-reduced-motion, live regions.
- **Solusi:** Audit + fix per component.
- **Dampak:** 3/5
- **Effort:** 3/5
- **Risiko:** Rendah

---

## NOT PLANNED (sengaja tidak dikerjakan untuk fokus)

- **Supabase Auth migration** — custom JWT works, migration cost > benefit sekarang.
- **Postgres migration** — Turso/libSQL cukup untuk scale saat ini. Supabase Postgres blocked oleh IPv6.
- **Multi-tenant / B2B** — fokus B2C dulu.
- **Mobile native app** — PWA cukup, native terlalu mahal.
- **Real-time collaboration** — solo user product, tidak butuh.
- **Payment integration** — belum ada pricing model, bukan prioritas.
- **Email sending** — tidak ada email verification/reset flow sekarang; butuh SMTP service dulu.
- **AI image generation** — di luar scope (CV photo upload sudah cukup).

---

## Progress Tracking

| ID | Status | Round | Commit |
|---|---|---|---|
| ROADMAP-001 | 🔴 TODO | - | - |
| ROADMAP-002 | 🔴 TODO | - | - |
| ROADMAP-003 | 🔴 TODO | - | - |
| ROADMAP-004 | 🔴 TODO | - | - |
| ROADMAP-005 | 🔴 TODO | - | - |
| ROADMAP-006 | 🔴 TODO | - | - |
| ROADMAP-007 | 🔴 TODO | - | - |
| ROADMAP-008 | 🔴 TODO | - | - |
| ROADMAP-009 | 🔴 TODO | - | - |
| ROADMAP-010 | 🔴 TODO | - | - |
| ROADMAP-011 | 🔴 TODO | - | - |
| ROADMAP-012 | 🔴 TODO | - | - |
| ROADMAP-013 | 🔴 TODO | - | - |
| ROADMAP-014 | 🔴 LATER | - | - |
| ROADMAP-015 | 🔴 LATER | - | - |
| ROADMAP-016 | 🔴 LATER | - | - |
| ROADMAP-017 | 🔴 LATER | - | - |
| ROADMAP-018 | 🔴 LATER | - | - |
| ROADMAP-019 | 🔴 LATER | - | - |
| ROADMAP-020 | 🔴 LATER | - | - |
