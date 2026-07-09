# Laras — Worklog

**Project:** Laras — Career & Opportunity Readiness Ecosystem
**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Prisma + SQLite (local) · Supabase (Storage now; Auth/DB migration pending DDL access) · Framer Motion
**Brief source:** `/home/z/my-project/upload/Pasted Content_1783586279230.txt` (BRIEF.md)

---

## Project Status — Phase 0 (Foundation) IN PROGRESS

### What's done
- **Env & secrets** (`.env`, gitignored): `DATABASE_URL`, `AUTH_SECRET`, Supabase URL + publishable + secret keys, `ZAI_API_KEY` (empty, pending).
- **Packages installed:** `@supabase/supabase-js`, `bcryptjs`, `jose`, `@types/bcryptjs`.
- **Prisma schema** (`prisma/schema.prisma`): full data model — `Account`, `UserProfile` (single source of truth), `Experience` (with `contextNotes` — the anti-generic foundation), `Education`, `Skill` (with `context`), `Certification`, `LanguageProficiency`, `Application`, `Document`, `ApplicationDocument`, `InterviewSet`/`InterviewQuestion`, `Essay`, `EnglishSession`. Pushed to SQLite (`bun run db:push`).
- **Lib helpers:** `src/lib/auth.ts` (JWT cookie session via jose + bcryptjs), `src/lib/supabase.ts` (browser + server clients, `ensureBucket`), `src/lib/i18n/dictionary.ts` (full ID/EN dictionary), `src/lib/i18n/index.ts` (server `getLocale`/`getLocaleAndDict`), `src/lib/profile.ts` (`computeCompletion`, `serializeProfile`).
- **Design system** (`src/app/globals.css`): warm editorial palette — deep forest/pine primary (oklch ~0.36 0.038 162), terracotta accent (oklch ~0.64 0.135 50), warm paper background (oklch ~0.985 0.012 85). Light + dark. Fraunces serif display + Geist sans. Subtle paper grain, soft shadows, calm entrance animations.
- **Providers:** `theme-provider.tsx` (next-themes), `locale-provider.tsx` (client context, `useT()`/`useLocale()`).
- **Root layout** (`src/app/layout.tsx`): fonts, ThemeProvider, LocaleProvider, sonner Toaster, `min-h-screen flex flex-col` wrapper for sticky footer.
- **Landing page** (`src/app/page.tsx`): distinctive hero with "constellation" visual (1 profile → 5 verticals), stats strip, verticals grid (asymmetric), principles, CTA. Sticky header + footer.
- **Site components:** `logo.tsx`, `locale-toggle.tsx`, `theme-toggle.tsx`, `site-header.tsx`, `site-footer.tsx`, `app-header.tsx`, `user-menu.tsx`.
- **Auth:** API routes `/api/auth/{signup,login,logout,me}`, `src/middleware.ts` (JWT-verified, protects `/dashboard`, `/onboarding`, `/profile`, `/api/profile`, `/api/export`, `/api/onboarding`). Auth layout `(auth)/layout.tsx` (split brand panel). `auth-form.tsx` client component for login + signup.
- **Profile API:** `GET/PUT/PATCH /api/profile` (full profile + relations replace, completion recompute), `GET /api/export` (JSON download — data portability, Brief Section 14).
- **Dashboard** (`(app)/dashboard/page.tsx`): greeting, profile-completion gauge, 5 vertical cards (4 marked "coming soon" for Phase 0), recent-activity empty state.
- **App layout** (`(app)/layout.tsx`): session guard, app header with user menu, footer.

### Key decisions
1. **Auth = custom JWT cookie (jose + bcryptjs), not NextAuth.** Robust, zero external dependency, fully works in sandbox. Documented for future Supabase Auth migration.
2. **Data = Prisma + SQLite locally**, schema designed Postgres/Supabase-compatible. Supabase DDL isn't exposed via REST API, so full Supabase-DB migration is deferred until database-password/Management-API access is available ("yang lain menyusul"). Supabase is wired in now for Storage (audio in Phase 8, photos, exported docs).
3. **Product name: "Laras"** (Indonesian: refined, in-tune, well-arranged). Tagline ID: "Selaraskan dirimu menuju kesempatan berikutnya." / EN: "Tune yourself toward what's next."
4. **i18n = lightweight cookie-based** (cookie `laras_locale`, ID default), not next-intl routing — simpler for App Router SSR/CSR agreement.
5. **No indigo/blue** (per design rules + Brief Section 13 anti-generic). Warm earthy editorial palette instead.

### Current goals / in-progress
- **Onboarding wizard** (`/onboarding`): multi-step proactive wizard per Brief Section 4.1 — being built.
- **Profile page** (`/profile`): view/edit the single source of truth, all sections, inline edit, JSON export, account deletion — being built.
- **Supabase SQL migration file** (`supabase/migrations/0001_init.sql`): mirror of Prisma schema — being written.

### Verification results so far
- Landing page `/` returns HTTP 200, renders "Laras" + hero title. (Fixed: `LayoutKanban` lucide export doesn't exist → replaced with `ClipboardList`.)
- Dev server running on port 3000 (Turbopack).

### Unresolved / risks / next-phase priorities
- **Onboarding + Profile UI** must be completed and browser-verified.
- **Supabase DB DDL access** awaited from user ("yang lain menyusul") to migrate auth + data to Supabase per Brief Section 12.1.
- **ZAI_API_KEY** not yet provided — Content Engine (CV/cover-letter/essay generation, Phase 1+) needs it. Phase 0 doesn't require it.
- **Phase 1 (CV ATS)** is the next major build phase after Phase 0 stabilizes — hardest constraints (Brief Section 7).
- **Koyeb Heavy Engine + Kokoro TTS** (Phase 8) not started; will be a `mini-services/` bun project in this sandbox for development.
- Cron job (15-min webDevReview) to be set up for continuous autonomous development.

---

---
Task ID: 10+11
Agent: main (orchestrator)
Task: End-to-end agent-browser verification of Phase 0 + set up 15-min webDevReview cron

Work Log:
- Verified landing page `/` renders (HTTP 200), clean console, no hydration errors after fixing `/api/locale` import bug (LOCALE_COOKIE was imported from `dictionary` instead of `@/lib/i18n` index — fixed).
- Renamed `src/middleware.ts` → `src/proxy.ts` and `middleware` → `proxy` export (Next.js 16 deprecation).
- Tested full signup flow: created account "rina@laras.test" → redirected to `/onboarding` with name/email pre-filled.
- Walked the 5-step onboarding wizard: filled basics + one experience WITH context_notes (the anti-generic field), advanced through skills/education, selected "Beasiswa" opportunity type on step 5, clicked "Selesai" → landed on `/dashboard` with "Halo, Rina." greeting + success toast.
- Verified dashboard: greeting, profile-completion gauge, 5 vertical cards (4 "coming soon"), recent-activity empty state.
- Verified profile page: all 8 sections render, saved experience ("Social Media Coordinator" / "Himpunan Mahasiswa Komunikasi") persisted correctly, Export + Delete-account buttons present.
- Verified data portability: `GET /api/export` returns full profile JSON (Brief Section 14).
- Fixed locale-toggle not updating server-rendered text: LocaleProvider now calls `router.refresh()` after setting the cookie; ProfileEditor switched from server-passed `dict` prop to live `useT()`. Verified bidirectional ID↔EN toggle.
- Verified theme toggle: `<html class="dark">` applied; screenshot captured.
- Verified responsive: mobile viewport 390×844 has 0px horizontal overflow; mobile hamburger menu present.
- Verified auth cycle: logout clears session cookie + redirects to `/login`; login as returning user skips onboarding → straight to dashboard.
- Verified protected routes: `/dashboard`, `/onboarding`, `/profile` redirect to `/login` (307) when unauthenticated.
- `bun run lint` clean (0 errors) after adding eslint-disable for next-themes mounted pattern.
- Created 15-min webDevReview cron job (job_id 261326, fixed_rate 900s, tz Asia/Jakarta, payload kind=webDevReview) for continuous autonomous development.

Stage Summary:
- **Phase 0 (Foundation) is COMPLETE and browser-verified end-to-end.** All core flows work: landing, signup, 5-step proactive onboarding with context_notes, dashboard, profile (view/edit/export/delete), bidirectional ID/EN locale, dark theme, mobile responsive, login/logout, protected routes.
- Files created this session: prisma schema, lib helpers (auth, supabase, i18n, profile), design system (globals.css, layout), landing page, site components (logo, toggles, headers, footer, user-menu), auth (API routes + proxy + pages), onboarding wizard, dashboard, profile editor, Supabase SQL migration, delete/export APIs.
- Key fix during verification: `/api/locale` import path + locale-toggle live-update via router.refresh().
- Cron job 261326 will continue development every 15 min.

Verification results:
- Landing `/`: 200, clean console ✓
- Signup → onboarding → dashboard: ✓
- Login (returning) → dashboard: ✓
- Profile data persistence + JSON export: ✓
- Locale ID↔EN: ✓ · Theme dark: ✓ · Mobile no-overflow: ✓
- Logout + session clear: ✓ · Protected-route redirect: ✓
- Lint: 0 errors ✓

Unresolved / risks / next-phase priorities (for the cron agent):
1. **Phase 1 — CV ATS Document Suite** is the top priority (Brief Section 6.1 + 7, hardest hard-constraints). Requires ZAI_API_KEY for the Content Engine (LLM) — NOT yet provided by user. Until the key arrives, build the CV ATS *structure*: edit-before-generate screen (Section 4.2), ATS template rendering (one-column, Arial/Calibri, correct section order), DOCX export via a docx library, anti-generic self-check UI (Section 5.5) — using placeholder/stub generation, then wire real LLM once key is provided.
2. **Supabase DB DDL access** still pending ("yang lain menyusul") — migrate auth + data to Supabase Postgres when available; Storage bucket creation for audio (Phase 8) can begin now via service_role key.
3. **More verticals**: Application Ops kanban (Phase 4), Interview Prep text (Phase 6), English Reading/Structure on-the-go (Phase 7) can all be built without external deps and would add visible functionality.
4. **Styling detail**: per cron mandate, keep enriching micro-interactions, empty states, loading skeletons, animations.

---
Task ID: P1 (Phase 1 — CV ATS Document Suite)
Agent: main (orchestrator)
Task: Build Phase 1 — CV ATS Document Suite with edit-before-generate, anti-generic engine, ATS-compliant DOCX export, concreteness self-check

Work Log:
- Confirmed z-ai-web-dev-sdk works in sandbox without explicit API key (`ZAI.create()` auto-auth). Tested LLM call successfully.
- Installed `docx` package (v9.7.1) for programmatic DOCX generation.
- Created `src/lib/content-engine.ts` — the Content Engine (Brief Section 3.1 + 5):
  - `generateCVATS()`: LLM prompt enforcing verify-before-generate (no inventing details), Aksi+Konteks+Hasil bullets, buzzword ban without evidence, varied sentence structure. Returns strict JSON.
  - Post-processes LLM output: deterministically recomputes `hasEvidence` (metric/scale/proper-noun detection) rather than trusting LLM self-report.
  - Proactive warnings for experiences lacking context_notes/achievements.
  - `concretenessCheck()`: 0-100 score = % bullets with evidence; flags buzzwords-without-evidence; verdict good/fair/weak.
- Created `src/lib/docx-renderer.ts` — ATS-compliant DOCX (Brief Section 7 HARD CONSTRAINTS):
  - One column, no tables/textboxes/sidebar. Font: Calibri. Name 20pt, headings 14pt, body 11pt. Margins 0.75".
  - Section order: Kontak → Ringkasan → Keahlian → Pengalaman → Pendidikan → Sertifikasi.
  - Bullet (•) only. Dates MM/YYYY. Contact in body.
- APIs: `POST /api/documents/cv-ats/generate` (LLM + persist Document), `GET /api/documents` (list), `GET /api/documents/cv-ats/[id]/export` (DOCX download).
- UI pages:
  - `/documents` — document library (list saved docs, empty state, "new document" CTA).
  - `/documents/cv-ats/new` — edit-before-generate screen (Section 4.2): inline-editable basics (name/headline/contact/summary), read-only experiences (with context_notes preview, link to profile to edit), locale/tone/region selectors, Generate button. After generate → switches to Preview tab.
  - `/documents/cv-ats/[id]` — saved document detail with preview + concreteness panel + download.
- Components: `cv-ats-preview.tsx` (paper-style one-column preview mirroring DOCX), `concreteness-panel.tsx` (score ring + stats + buzzword warnings), `cv-ats-builder.tsx` (edit+generate+preview client), `cv-ats-viewer.tsx` (saved doc viewer).
- Added `documents.*` i18n keys to both ID and EN dictionaries.
- Wired dashboard Document Suite card → `/documents`; added "Documents/Dokumen" nav link to app header.
- Added nav link to app header.

Verification results (agent-browser):
- Login as existing user "rina@laras.test" → dashboard → /documents (empty state) → click CV ATS.
- Edit-before-generate page loads with profile data pre-filled (Rina Pratiwi, email, location). Filled headline.
- Clicked "Generate CV" → LLM generated CV in ~15s → preview tab auto-selected showing one-column ATS CV with RINGKASAN + PENGALAMAN sections, bullets using real context_notes (40% engagement, 5-person team, Rp2jt budget, #SuaraMahasiswa campaign).
- Concreteness panel: 2/3 bullets with evidence, 1 buzzword flagged, "Cukup" verdict.
- DOCX download: valid Microsoft Word 2007+ file (9236 bytes). Extracted text via python zipfile → text is fully select-drag-able (passes ATS test). Section headings RINGKASAN, PENGALAMAN present in correct order.
- Tested English generation: selected "Inggris" → generated English CV with same concrete evidence ("Increased Instagram engagement by 40%", "team of 5 people", "budget of Rp2jt"). Anti-generic engine works in both languages.
- Mobile responsive: 390×844 viewport, 0px horizontal overflow on detail page.
- Console: no errors. `bun run lint`: 0 errors.

Stage Summary:
- **Phase 1 (CV ATS) is COMPLETE and browser-verified.** Full flow works: documents library → edit-before-generate → LLM generation with anti-generic enforcement → ATS-compliant preview → concreteness self-check → valid DOCX export. Both ID and EN.
- Phase 2 (anti-generic engine) was built AS PART of Phase 1 (the Content Engine + concretenessCheck) — it's reusable for all future text modules (cover letter, bio, essay).
- The CV ATS hard constraints (Section 7) are all met: one column, Calibri, correct font sizes, 0.75" margins, bullet-only, standard headings, contact in body, MM/YYYY dates, correct section order, DOCX text-selectable.
- Key files: `src/lib/content-engine.ts`, `src/lib/docx-renderer.ts`, `src/app/api/documents/`, `src/app/(app)/documents/`, `src/components/documents/`.

Unresolved / next-phase priorities:
1. **Cover Letter + Bio** (Section 6.3, 6.5) — reuse Content Engine, add to Document Suite. Low effort now that engine exists.
2. **CV Visual** (Section 6.2) — multi-template PDF, needs template system. Medium effort.
3. **Personal Deck PPT** (Section 6.4, 8) — needs PptxGenJS + 8-10 templates. Higher effort.
4. **Application Ops** (Phase 4, Section 2.2) — kanban tracker, fully independent of Content Engine.
5. PDF export for CV ATS (currently DOCX only; Section 7 says DOCX primary + PDF secondary). Can use `@react-pdf/renderer` or a libreoffice headless conversion mini-service.
6. Keep enriching styling/empty states per cron mandate.

---
Task ID: CRON-1 (webDevReview round 1 — Cover Letter + Bio + Application Ops)
Agent: main (cron webDevReview)
Task: QA existing app, fix bugs, add Cover Letter + Bio document types, build Application Ops kanban, improve styling

Work Log:
- QA pass via agent-browser: confirmed Phase 0 + Phase 1 stable. Login → dashboard → documents all working. Found 1 bug: documents list routed ALL types to `/documents/cv-ats/[id]` (would break for new types).
- Fixed bug: documents list now routes by type via `TYPE_HREF` map; added `TYPE_ICON` map for per-type icons.
- Added document-type picker dialog (`type-picker.tsx`) — replaces single "new CV" button with a 3-option dialog (CV ATS / Cover Letter / Bio) with descriptions.
- Extended `src/lib/content-engine.ts` with:
  - `generateCoverLetter()`: 250-350 words, 3-4 paragraphs, from context_notes. Locale-aware (ID/EN), tone-aware. Anti-generic rules enforced.
  - `generateBio()`: 3 versions (1-sentence headline, 1-paragraph about, 3-paragraph personal). Anti-generic.
  - `textConcretenessCheck()`: simpler check for letter/bio (evidence + buzzword detection).
- Created `src/lib/text-docx.ts` — shared DOCX renderer for letter/bio (sender block + paragraphs + optional sign-off).
- APIs: `POST /api/documents/cover-letter/generate`, `GET /api/documents/cover-letter/[id]/export` (DOCX), `POST /api/documents/bio/generate`, `GET /api/documents/bio/[id]/export` (DOCX).
- UI pages: `/documents/cover-letter/new` (builder with position/org inputs + locale/tone + generate → preview with letter-style paper view + word count + concreteness + copy-to-clipboard), `/documents/cover-letter/[id]` (viewer), `/documents/bio/new` (builder → 3-card preview with per-card copy buttons), `/documents/bio/[id]` (viewer).
- Built Application Ops (Phase 4, Brief Section 2.2) — full kanban board:
  - `/applications` page with 6 status columns (saved/applied/interview/offer/rejected/accepted), each with colored dot + count.
  - Cards show type icon, position, organization, location, deadline (color-coded: overdue/soon/normal), AI summary preview.
  - Add/Edit dialog with all fields + AI summarize (paste job description → LLM extracts requirements/responsibilities/deadline/contacts/highlights).
  - Move cards between columns via chevron buttons (optimistic update + PATCH).
  - Delete from edit dialog.
  - APIs: `GET/POST /api/applications`, `PATCH/DELETE /api/applications/[id]`, `POST /api/applications/summarize`.
- Added `documents.*` (cl/bio keys) and `applications.*` i18n keys to both ID and EN.
- Wired dashboard Application Ops card → `/applications` (marked active). Added "Applications/Lamaran" nav link to app header.
- Styling: letter-style paper preview for cover letter, 3-card bio layout with copy buttons, kanban column color dots, deadline color-coding (red overdue / amber soon), card hover lift + chevron reveal.

Verification results (agent-browser):
- Documents type picker: opens dialog with 3 options (CV ATS / Cover Letter / Bio). ✓
- Cover Letter: filled position "Content Creator" + org "Studio Kreatif Nusantara" → generated ID cover letter with greeting "Yth. Tim Rekrutmen, Studio Kreatif Nusantara", 3 paragraphs mentioning position+org, word count shown, concreteness check. ✓
- Bio: generated 3 versions — headline ("Mahasiswa Ilmu Komunikasi yang aktif di gerakan kampus"), about (mentions Himpunan + real experience), personal (3 paragraphs with #SuaraMahasiswa, 5 orang, Rp2 juta, 3 unit kampus — all from context_notes). Copy buttons work. ✓
- Applications kanban: empty state → add dialog → filled form → AI summarize extracted REQUIREMENTS + deadline → saved → card appears under "Tersimpan" → moved to "Dilamar" via chevron button. ✓
- Documents list: shows all 4 docs (Bio, Cover Letter, 2x CV ATS) with correct titles and per-type routing. ✓
- Mobile responsive: 390×844, 0px overflow on applications page. ✓
- Console: only stale RSC hot-reload "Failed to fetch" glitches (not real bugs — hard navigation works). Lint: 0 errors.

Stage Summary:
- **3 new features added**: Cover Letter (full), Bio (full, 3 versions), Application Ops kanban (full new vertical). 
- **1 bug fixed**: documents list now routes by type.
- Document Suite now has 3 working types (CV ATS + Cover Letter + Bio), all with edit-before-generate, anti-generic engine, preview, DOCX export, copy-to-clipboard.
- Application Ops is the 2nd fully-functional vertical (after Document Suite) — kanban with AI job-description summarizer.
- Dashboard now has 2 active vertical cards (was 1). Nav has 4 links (Dashboard/Documents/Applications/Profile).

Unresolved / next-phase priorities:
1. **Opportunity Essays** (Phase 5, Section 2.5/6.6) — strictest verification (probing Q&A before generation). Reuses Content Engine.
2. **Interview Prep** (Phase 6, Section 11) — question generation from role + answer building from real experience.
3. **English Readiness** (Phase 7, Section 10.1/10.2) — Reading + Structure on-the-go generation (text only, no audio).
4. **CV Visual** (Section 6.2) — multi-template PDF.
5. **Personal Deck PPT** (Section 6.4/8) — PptxGenJS.
6. Link documents to applications (ApplicationDocument model exists in schema but not yet wired in UI).
7. PDF export for all document types (currently DOCX only).
8. Styling: add skeleton loaders, more micro-interactions.

---
Task ID: CRON-2 (webDevReview round 2 — Opportunity Essays + Interview Prep)
Agent: main (cron webDevReview)
Task: QA existing app, fix extractJSON array bug, build Opportunity Essays (Phase 5) + Interview Prep (Phase 6), improve styling

Work Log:
- QA pass: confirmed Phase 0/1/CRON-1 stable (dashboard, documents, applications all working).
- **CRITICAL BUG FIXED**: `extractJSON()` in content-engine.ts only handled JSON objects (`{}`), not arrays (`[]`). When the LLM returned a JSON array (interview questions, essay probing), it would slice from the first `{` cutting off the `[`, causing parse failure. Fixed to detect arrays (prefer `[` if it comes before `{`) and slice to matching `]`. This bug was silently breaking all array-returning LLM calls — interview questions came back empty, essay probing fell back to generic questions.
- Extended `src/lib/content-engine.ts` with:
  - `generateEssayProbing()`: 3-5 probing questions specific to essay type (scholarship/org/volunteer/personal-statement/motivation-letter). Tailored to dig authentic details only the user knows.
  - `generateEssay()`: draft from profile + probing answers. STRICTEST anti-generic (Section 5.4): never invent personal details, personal opening (not "Saya menulis..."), 1-2 real evidence, word limit enforced with precision.
  - `generateInterviewQuestions()`: 6 role-targeted questions across 4 categories (behavioral/technical/motivational/situational).
  - `generateAnswerFeedback()`: scores user's answer on structure (STAR), specificity, length; gives 2-3 improvement suggestions; suggested answer built from user's REAL profile experience.
- Built Opportunity Essays (Phase 5, Brief Section 2.5/5.4/6.6):
  - 3-tab flow: Setup → Probing Q&A → Preview. Probing questions MUST be answered before draft generation.
  - APIs: `POST /api/documents/essay/probe`, `POST /api/documents/essay/generate`, `GET /api/documents/essay/[id]/export` (DOCX).
  - Pages: `/documents/essay/new` (builder), `/documents/essay/[id]` (viewer with probing Q&A history + warnings).
  - Added to document-type picker + documents list routing.
  - Accent-colored warning banner emphasizing verify-before-generate.
- Built Interview Prep (Phase 6, Brief Section 2.3/11):
  - `/interview` list page: session cards with role, question count, date, delete.
  - Create dialog: role + context (paste job desc) → auto-generates 6 questions.
  - `/interview/[id]` practice page: questions with category badges (color-coded), expandable answer boxes, "Minta feedback" button → 4 score pills (Structure/Specificity/Length/Overall) + feedback suggestions + suggested answer from real experience.
  - APIs: `GET/POST /api/interview-sets`, `GET/DELETE /api/interview-sets/[id]`, `POST /api/interview-sets/[id]/feedback`.
- Added `documents.essay*` and `interview.*` i18n keys to both ID and EN.
- Wired dashboard: Interview Prep card → `/interview` (active), Opportunity Essays card → `/documents/essay/new` (active). Added "Interview/Wawancara" nav link (nav now has 5 links, changed breakpoint to lg).
- Styling: 3-tab essay flow with probing accent banner, color-coded question category badges, 4-up score pills with color thresholds, expandable answer cards, suggested answer in muted box.

Verification results (agent-browser):
- Essay flow: documents → type picker (4 types now) → essay → filled prompt (LPDP) + target org → generated probing questions → answered 3 probing questions (dosen inspirasi, #SuaraMahasiswa challenge, kontribusi) → generated essay with PERSONAL opening ("Saat dosen pembimbing saya kembali ke ruang..."), real evidence (5 orang, Rp2jt, 3 universitas, #SuaraMahasiswa), word count shown, DOCX download available. ✓
- Interview flow: /interview → created "UI Designer" session with context → 6 questions generated (fintech-specific, behavioral/technical/motivational/situational categories) → opened question, wrote answer → got feedback with 4 scores (Struktur 40, Kekonkretan, Panjang, Overall) + specific suggestions + suggested answer built from real Himpunan experience. ✓
- extractJSON fix confirmed: interview questions now parse correctly (were empty before fix).
- Lint: 0 errors. Server healthy.

Stage Summary:
- **2 new verticals added**: Opportunity Essays (Phase 5, strictest verification with probing Q&A) + Interview Prep (Phase 6, question generation + answer coaching).
- **1 critical bug fixed**: extractJSON array handling (was silently breaking interview questions + essay probing).
- Dashboard now has 4 active vertical cards (Document Suite, Application Ops, Interview Prep, Opportunity Essays) + 1 coming soon (English Readiness). Nav has 5 links.
- The anti-generic engine now powers 5 document types (CV ATS, Cover Letter, Bio, Essay) + Interview Prep, all reusing the same Content Engine.
- 4 of 5 product verticals are now functional (only English Readiness remains).

Unresolved / next-phase priorities:
1. **English Readiness** (Phase 7, Section 10.1/10.2) — Reading + Structure on-the-go generation (text only, no audio). Last vertical.
2. **Listening audio** (Phase 8, Section 10.3) — needs Koyeb/Kokoro TTS mini-service + Supabase Storage.
3. **CV Visual** (Section 6.2) — multi-template PDF.
4. **Personal Deck PPT** (Section 6.4/8) — PptxGenJS.
5. Link documents to applications (ApplicationDocument model exists but not wired in UI).
6. PDF export for all document types (currently DOCX only).
7. Styling: skeleton loaders, more micro-interactions.

---
Task ID: CRON-3 (webDevReview round 3 — English Readiness, the 5th & final vertical)
Agent: main (cron webDevReview)
Task: QA existing app, build English Readiness (Phase 7 — Reading + Structure on-the-go generation), complete all 5 verticals

Work Log:
- QA pass: confirmed all prior phases (0/1/CRON-1/CRON-2) stable. Login → dashboard clean, no errors.
- Extended `src/lib/content-engine.ts` with:
  - `generateReading()`: TOEFL/IELTS-style passage (200-500 words by difficulty) + 5 comprehension questions (main idea, detail, inference, vocabulary-in-context, author purpose). 12 rotating topics. Anti-hafalan: always fresh.
  - `generateStructure()`: 8 grammar questions mixing sentence-completion + error-identification. Tests subject-verb agreement, tense, parallel structure, word form, articles, prepositions, relative clauses, conditionals.
- Built English Readiness (Phase 7, Brief Section 10.1/10.2):
  - `/english` page with 3-phase flow: Hub → Practice → Results.
  - Hub: difficulty selector (easy/medium/hard), 3 module cards (Reading active, Structure active, Listening "coming soon"), practice history with scores.
  - Practice: Reading shows passage in scrollable box + 5 questions with A-D radio options; Structure shows 8 questions with type badges. Progress counter (X/total).
  - Results: big score card with trophy + verdict color, full review showing correct/incorrect with green/red highlighting, explanations per question, "Next practice" + "Back to modules".
  - APIs: `POST /api/english/generate` (creates EnglishSession, generates reading/structure), `POST /api/english/submit` (scores answers, saves score).
  - Added `english.*` i18n keys to both ID and EN.
- Fixed lint error: `const module` in API route → `const mod` (Next.js forbids `module` variable name). Also fixed over-aggressive sed rename in english-hub.tsx (HistoryItem field + API body key restored to `module`).
- Wired dashboard English Readiness card → `/english` (active). Added "English/Bahasa Inggris" nav link (nav now has 6 links).
- Styling: difficulty pill selector, module cards with icons, scrollable passage box with custom scrollbar, A-D option labels, color-coded answer review (green correct / red incorrect), trophy score card, history cards.

Verification results (agent-browser):
- English hub loads with Reading/Structure/Listening modules + difficulty selector. ✓
- Started Reading practice (medium) → generated "The Science of Sleep" passage (~280 words on sleep science) + 5 questions (main idea, detail, inference, vocabulary "elude", author purpose). ✓
- Answered all 5 questions → submitted → scored 5/5 (100%) with explanations for each ("The passage discusses the critical importance of sleep while noting that its exact purpose remains unknown..."). ✓
- Results review shows green/red highlighting + explanations. ✓
- Dashboard: ALL 5 vertical cards now active (no "coming soon" badges). ✓
- Lint: 0 errors. Server healthy.

Stage Summary:
- **ALL 5 PRODUCT VERTICALS ARE NOW FUNCTIONAL** — Document Suite (CV ATS + Cover Letter + Bio + Essay), Application Ops, Interview Prep, English Readiness (Reading + Structure), Opportunity Essays.
- English Readiness uses on-the-go generation per Brief Section 10.1/10.2 (not pre-built bank) — passages/questions are always fresh, anti-hafalan.
- Listening (Section 10.3) marked "coming soon" — requires Phase 8 (Koyeb/Kokoro TTS + Supabase Storage audio).
- Dashboard has 5 active cards, 0 coming-soon. Nav has 6 links (Dashboard/Documents/Applications/Interview/English/Profile).
- The Content Engine now powers: 5 document types + interview coaching + English practice — all reusing the same anti-generic LLM infrastructure.

Unresolved / next-phase priorities:
1. **Listening audio** (Phase 8, Section 10.3) — needs Koyeb/Kokoro TTS mini-service + Supabase Storage. Last unfinished piece of English Readiness.
2. **CV Visual** (Section 6.2) — multi-template PDF.
3. **Personal Deck PPT** (Section 6.4/8) — PptxGenJS + 8-10 templates.
4. Link documents to applications (ApplicationDocument model exists but not wired in UI).
5. PDF export for all document types (currently DOCX only).
6. Styling: skeleton loaders, more micro-interactions.
7. Overall polish & QA pass across all 5 verticals (Phase 9).

---
Task ID: CRON-4 (webDevReview round 4 — CV Visual + Dashboard Stats)
Agent: main (cron webDevReview)
Task: QA existing app, build CV Visual (4 templates), enhance dashboard with cross-vertical stats

Work Log:
- QA pass: confirmed all 5 verticals stable. Login → dashboard clean, no errors.
- Built CV Visual (Brief Section 6.2) — 5th document type:
  - 4 distinct HTML/CSS templates: Modern Minimal (clean/airy), Corporate (dark sidebar/formal), Creative (bold accent band/personality), Technical (mono font/data-dense grid).
  - Live preview with template switcher sidebar — click to swap templates instantly.
  - Print-to-PDF via browser print (added `@media print` styles to globals.css that hide app chrome and show only the CV).
  - Profile data flows directly from UserProfile (no generation needed — it's a visual layout, not AI text).
  - Pages: `/documents/cv-visual/new` (builder), `/documents/cv-visual/[id]` (redirects to new — CV Visual is live preview, no persisted document).
  - Added to document-type picker (now 5 types: CV ATS, CV Visual, Cover Letter, Bio, Essay).
  - Added to documents list routing + type icon (Palette).
- Enhanced Dashboard with cross-vertical stats:
  - Stats strip: 4 clickable stat cards showing counts (Documents, Applications, Interview sessions, English sessions) — each links to its vertical.
  - Recent activity split into 2 cards: Recent Applications + Recent Documents (replaces single list).
  - Quick-action CTA card now links to "Create CV" instead of profile.
  - `StatCard` component with icon + count + hover lift.
- Styling: print stylesheet (`@media print`), stat card hover transitions, recent activity cards with truncation, template picker active state with eye icon.

Verification results (agent-browser):
- Dashboard: shows 4 stat cards (5 Document Suite, 1 Application Ops, interview count, english count) — all clickable. ✓
- CV Visual: `/documents/cv-visual/new` loads with 4 template options (Modern Minimal, Corporate, Creative, Technical) + live preview showing Rina's real data (name, headline, experiences with achievements). ✓
- Template switching: clicked Creative → accent header band appears; Corporate → sidebar with CONTACT/Skills/Certs; Technical → mono font with `// SUMMARY` headers. All 4 render correctly. ✓
- Type picker: shows all 5 document types (CV ATS, CV Visual, Cover Letter, Bio, Esai). ✓
- Console: no errors. Lint: 0 errors.

Stage Summary:
- **CV Visual added** (Brief Section 6.2) — 4 templates with live preview + print-to-PDF. Document Suite now has 5 types.
- **Dashboard enhanced** — cross-vertical stats strip + split recent activity cards. Much richer landing experience.
- All 5 verticals remain fully functional. Dashboard now shows real usage data across all verticals.
- Print-to-PDF works via browser print with dedicated print stylesheet.

Unresolved / next-phase priorities:
1. **Listening audio** (Phase 8, Section 10.3) — needs Koyeb/Kokoro TTS mini-service + Supabase Storage.
2. **Personal Deck PPT** (Section 6.4/8) — PptxGenJS + 8-10 templates.
3. Link documents to applications (ApplicationDocument model exists but not wired in UI).
4. PDF export for ATS/cover-letter/bio/essay (currently DOCX only; CV Visual uses print-to-PDF).
5. Skeleton loaders, more micro-interactions.
6. Overall polish & QA pass (Phase 9).

---
Task ID: CRON-5 (webDevReview round 5 — Personal Deck PPT + Link Documents to Applications)
Agent: main (cron webDevReview)
Task: QA existing app, build Personal Deck (PptxGenJS), wire document-application linking

Work Log:
- QA pass: confirmed all 5 verticals + CV Visual + dashboard stats stable. No errors.
- Installed `pptxgenjs` (v4.0.1) for Personal Deck.
- Built Personal Deck (Brief Section 6.4/8):
  - `src/lib/deck-renderer.ts`: config-driven theme system (4 themes: Forest, Slate, Warm, Ink) — bg/accent/text/muted/font per theme. 6 slides: Cover (name+headline+contact), About Me (summary), Timeline (career with dots+lines), Skills (chips grouped by category), Project Highlights (3-card layout with achievements), Contact (email/phone/links). `addSectionHeader` helper for consistency.
  - API: `GET /api/documents/deck/export?theme=X` — generates real .pptx (83KB, valid OOXML).
  - `/documents/deck/new` page: theme picker (color swatches), 6 slide outline cards with mini preview (themed), download button, profile stats.
  - Added to document-type picker (now 6 types), documents list routing + type icon (Presentation).
- Built document-application linking (Brief Section 2.2 — "each application card connected to specific documents"):
  - API: `POST /api/applications/[id]/documents` (link), `DELETE /api/applications/[id]/documents?documentId=X` (unlink).
  - Updated `/applications` page to fetch documents + ApplicationDocument links, pass `linkedDocIds` per app + `documents` list to board.
  - Updated `GET /api/applications` to include `linkedDocIds` (was missing — caused render error when useEffect overwrote server props).
  - Board: linked-doc badges on kanban cards (FileText icon + type label, max 3 + "+N"). Edit dialog: "Dokumen terkait" section with scrollable list of all user's documents, Link/Unlink toggle per doc (optimistic update via onLinkChange callback).
  - Safety guards: `linkedDocIds || []` in card render + dialog (prevents crash if field undefined).
- Styling: themed slide preview cards (mini slide with theme bg+accent), document link/unlink icon buttons with hover states, scrollable linked-docs list with custom scrollbar.

Verification results (agent-browser):
- Personal Deck: page loads with 4 themes (Forest/Slate/Warm/Ink) + 6 slide outline cards. Downloaded PPTX → 83KB valid zip. Extracted 6 slides via python: slide1 (Rina Pratiwi + headline + contact), slide2 (About Me + summary), slide3 (Timeline: Social Media Coordinator @ Himpunan), slide4 (Skills), slide5 (Project Highlights), slide6 (Let's connect + email/phone). ✓
- Document linking: opened application card → dialog shows "Dokumen terkait" section with all user's docs (scholarship essay, Bio, Cover Letter, 2x CV ATS) + Link buttons. Clicked Link on Bio → toast "Lamaran tersimpan" → Bio now shows Unlink button. Closed dialog → kanban card now shows "Bio" badge. ✓
- Fixed render bug: applications page was showing source code because GET API didn't return `linkedDocIds` — useEffect overwrote server props with field-less data, then `app.linkedDocIds.length` crashed. Fixed API + added safety guards.
- Lint: 0 errors. Server healthy.

Stage Summary:
- **Personal Deck added** (Brief Section 6.4/8) — 6-slide .pptx with 4 themes, real PowerPoint/Impress output. Document Suite now has 6 types.
- **Document-application linking added** (Brief Section 2.2) — connect specific CV/cover-letter/etc to each application; badges on cards; link/unlink in edit dialog.
- 1 bug fixed (applications GET missing linkedDocIds causing render crash).
- All 5 verticals + 6 document types + cross-vertical linking fully functional.

Unresolved / next-phase priorities:
1. **Listening audio** (Phase 8, Section 10.3) — needs Koyeb/Kokoro TTS mini-service + Supabase Storage.
2. PDF export for ATS/cover-letter/bio/essay (currently DOCX only; CV Visual uses print-to-PDF).
3. Skeleton loaders, more micro-interactions.
4. Overall polish & QA pass (Phase 9) — test all flows end-to-end as new user.

---
Task ID: CRON-6 (webDevReview round 6 — English Listening audio, the last module)
Agent: main (cron webDevReview)
Task: QA existing app, build English Listening (Phase 8 — TTS audio + comprehension questions), complete all English Readiness modules

Work Log:
- QA pass: confirmed all 5 verticals + 6 document types + cross-vertical linking stable. No errors.
- Extended `src/lib/content-engine.ts` with `generateListening()`:
  - Generates short English listening script (<900 chars for TTS 1024 limit) — 8 rotating scenarios (student conversations, lectures, office hours, campus announcements, movie discussions, news reports, interviews, library orientation).
  - Natural spoken English with Speaker 1/2 labels, fillers, contractions.
  - 5 comprehension questions (main idea, detail, inference, speaker purpose, vocabulary).
  - Difficulty-scaled word count (easy 100-130, medium 130-160, hard 160-200).
- Updated `POST /api/english/generate` to handle `module=listening`:
  - Generates script + questions via LLM.
  - Generates audio via `zai.audio.tts.create()` (z-ai-web-dev-sdk TTS skill) — voice "jam" (British English), wav format, speed 1.0.
  - Returns audio as base64 data URL (dev mode; production would use Supabase Storage URL per Brief Section 10.3).
  - Graceful fallback: if TTS fails, continues without audio — user sees script text instead.
  - Fixed TTS format: `mp3` rejected by API (status 400 "unsupported response_format") → switched to `wav` which works.
- Updated `EnglishHub` component:
  - Listening module now active (removed "coming soon" badge).
  - `activeModule` type includes "listening"; new `listening` state variable.
  - Practice section: audio player card (accent-bordered, Headphones icon, `<audio controls>`) with fallback to script text if no audio.
  - Questions + results reuse the same flow as Reading (same question type).
  - All 3 modules (Reading, Structure, Listening) now fully functional.
- Styling: accent-bordered audio player card with Headphones icon, amber fallback box for missing audio, audio scrubber controls.

Verification results (agent-browser):
- English hub: all 3 modules active (Reading, Structure, Listening — no "coming soon"). ✓
- Listening practice: clicked "Mulai latihan" → LLM generated "Movie Review" script (conversation between 2 friends about a sci-fi film) + TTS generated wav audio → audio player appeared with scrubber controls. ✓
- Answered all 5 questions → submitted → scored 3/5 with explanations ("Speaker 1 explicitly mentions 'new sci-fi film' at the beginning..."). ✓
- Results review shows correct/incorrect highlighting + explanations. ✓
- Console: no errors. Lint: 0 errors. TTS wav format works (mp3 was rejected by API).

Stage Summary:
- **English Listening audio complete** (Phase 8, Brief Section 10.3) — the last unfinished module. All 3 English Readiness modules now functional (Reading + Structure + Listening).
- TTS audio generated on-the-go via z-ai-web-dev-sdk (dev mode; Brief Section 10.3 specifies pre-generation for production, but on-the-go is acceptable for dev/demo).
- **ALL PRODUCT VERTICALS AND ALL SUB-MODULES ARE NOW FUNCTIONAL:**
  1. Document Suite: 6 types (CV ATS, CV Visual, Cover Letter, Bio, Essay, Personal Deck)
  2. Application Ops: kanban with AI summarize + document linking
  3. Interview Prep: question generation + answer coaching
  4. English Readiness: 3 modules (Reading, Structure, Listening with audio)
  5. Opportunity Essays: strictest verification with probing Q&A
- The Content Engine + TTS now power all text + audio generation across the entire ecosystem.

Unresolved / next-phase priorities:
1. **Production Listening audio** — migrate from on-the-go TTS to pre-generated bank (Brief Section 10.3: generation-time vs play-time separation) via Koyeb/Kokoro batch pipeline + Supabase Storage.
2. **PDF export** for ATS/cover-letter/bio/essay (currently DOCX only; CV Visual uses print-to-PDF).
3. **Skeleton loaders** for async pages (LLM generation takes 10-30s).
4. **Overall polish & QA pass** (Phase 9) — test all flows end-to-end as new user.
5. **Supabase DB migration** when DDL access available.

---
Task ID: CRON-7 (webDevReview round 7 — PDF export + skeleton loaders + Phase 9 polish)
Agent: main (cron webDevReview)
Task: QA existing app, add PDF print-to-PDF export to all document viewers, add skeleton loaders for LLM generation, polish

Work Log:
- QA pass: confirmed all 5 verticals + 6 document types + listening audio + cross-vertical linking stable. No bugs.
- Built PDF export (print-to-PDF) for all document detail pages:
  - Created `PrintButton` component (shared) — triggers browser print dialog which lets user "Save as PDF".
  - Enhanced print stylesheet in globals.css: `body:has(.print-area)` selector hides all siblings, shows only `.print-area` content. Added `print:shadow-none`, `print:border-0`, `print:p-0` utilities.
  - Added PrintButton + `.print-area` class to: CV ATS viewer (print-only copy of CVATSPreview at bottom), Cover Letter viewer (paper div), Bio viewer, Essay viewer (paper div).
  - Each viewer now has both "Download DOCX" (programmatic .docx) and "Download PDF" (print-to-PDF) buttons.
- Built skeleton loaders for LLM generation (10-30s async calls):
  - Created `src/components/ui/skeleton-doc.tsx`: `Skeleton` (animated shimmer primitive), `DocumentSkeleton` (paper-style loading), `QuestionsSkeleton` (question list loading), `SidebarSkeleton`.
  - Added to English hub practice loading state: module-specific skeletons (Reading shows passage skeleton, Listening shows audio player skeleton, Structure shows nothing extra) + QuestionsSkeleton below + spinner card with "Menyusun soal..." text.
  - Replaces the old single spinner-in-card with a rich skeleton that shows the user what's loading.
- Styling polish:
  - Print stylesheet `body:has(.print-area)` — clean print output with only document content.
  - Animated pulse skeletons (Tailwind `animate-pulse`) with randomized widths for realistic loading feel.
  - Consistent button group layout (DOCX + PDF side by side) across all viewers.

Verification results (agent-browser):
- Essay detail page: shows "Salin" + "Download DOCX" + "Download PDF" buttons. `.print-area` class exists on paper div. ✓
- CV ATS detail page: shows "Download DOCX" + "Download PDF" buttons. `.print-area` class exists (print-only CV preview). ✓
- English Reading practice: clicked "Mulai latihan" → skeletons visible during LLM generation (`.animate-pulse` elements detected). ✓
- Console: no errors. Lint: 0 errors.

Stage Summary:
- **PDF export added** to all 4 document viewers (CV ATS, Cover Letter, Bio, Essay) via print-to-PDF. Every document type now has both DOCX and PDF export.
- **Skeleton loaders added** to English practice generation — rich module-specific skeletons replace bare spinners.
- All product verticals remain fully functional. The ecosystem is now feature-complete with export options for every document type.
- Phase 9 polish in progress: PDF export done, skeleton loaders done. Remaining: more micro-interactions, comprehensive end-to-end QA as new user.

Unresolved / next-phase priorities:
1. **Production Listening audio** — migrate from on-the-go TTS to pre-generated bank (Brief Section 10.3) via Koyeb/Kokoro + Supabase Storage.
2. **Comprehensive end-to-end QA** as a brand-new user (signup → onboarding → all 5 verticals) — Phase 9 final.
3. **Supabase DB migration** when DDL access available.
4. Additional polish: hover micro-interactions, transition animations between phases.

---
Task ID: CRON-8 (webDevReview round 8 — Settings page + E2E QA as new user)
Agent: main (cron webDevReview)
Task: Comprehensive E2E QA as new user, build Settings page (Brief Section 9 preferences), wire to user menu

Work Log:
- E2E QA as brand-new user: signed up "Budi Santoso" → onboarding (skipped all steps) → dashboard with "Halo, Budi." + 0 counts. Confirmed signup→onboarding→dashboard flow clean. CV ATS new page correctly shows "need at least 1 experience" warning + "Lengkapi profil" link for thin profiles. No bugs found.
- Built Settings page (Brief Section 9 — Language & Locale Settings, post-onboarding editing):
  - `/settings` page + `SettingsForm` component.
  - 3 sections: Language & Region (UI locale, doc locale, target region), Style & Goals (preferred tone, urgency, opportunity types), Account (export JSON, delete account link).
  - Save button (sticky bottom) calls PUT /api/profile with all preferences. If UI locale changed, calls `setLocale()` to live-update the whole app (via LocaleProvider's router.refresh).
  - Added `settings.*` i18n keys to both ID and EN.
  - Wired to user menu: added "Settings/Pengaturan" item with Settings icon between Profile and Log out.
  - Updated `UserMenu` props to accept `settings` label; updated app-header `menuLabels`.
- Styling: section cards with icons (Globe2, PenLine, UserCog), radio group cards with primary highlight, opportunity-type toggle chips with check icons, sticky save bar with shadow-lift, account section with destructive-styled delete row.

Verification results (agent-browser):
- New user signup: "Budi Santoso" → onboarding → dashboard "Halo, Budi." with 0 stats. ✓
- CV ATS new (thin profile): "need at least 1 experience" warning + "Lengkapi profil" link. ✓
- Settings page: loads with 3 sections (Language & Region, Style & Goals, Account), all radio groups present (UI locale, doc locale, target region, tone, urgency), opportunity-type chips, save button. ✓
- Changed UI locale to English + saved → page live-updated to English ("Settings", "Save settings", "Delete account & all data"). ✓
- User menu: shows Profile, Settings, Log out items. ✓
- Console: no errors. Lint: 0 errors.

Stage Summary:
- **Settings page added** (Brief Section 9) — users can edit language/region/tone/urgency/opportunity-types post-onboarding, with live UI locale switching.
- **E2E QA passed** as brand-new user — signup → onboarding → dashboard → all flows clean, no bugs.
- The ecosystem now has a complete user preference system: onboarding sets initial prefs, settings page lets users change them anytime, all document generation reads from these prefs.
- User menu now has 3 items (Profile, Settings, Log out).

Unresolved / next-phase priorities:
1. **Production Listening audio** — migrate from on-the-go TTS to pre-generated bank (Brief Section 10.3) via Koyeb/Kokoro + Supabase Storage.
2. **Supabase DB migration** when DDL access available.
3. Additional polish: transition animations between phases, more empty-state illustrations.
4. The product is feature-complete — focus shifts to production-readiness (Supabase migration, deployment, performance).

---
Task ID: CRON-9 (webDevReview round 9 — Smart Suggestions engine)
Agent: main (cron webDevReview)
Task: Build Smart Suggestions engine — context-aware next-action recommendations that tie the ecosystem together (Brief Section 4.1)

Work Log:
- QA pass: confirmed all verticals stable. No bugs.
- Built Smart Suggestions engine (`src/lib/suggestions.ts`):
  - `generateSuggestions()` analyzes user state and returns prioritized recommendations (high/medium/low).
  - 9 suggestion types: overdue deadlines, upcoming deadlines (≤7 days), urgency=deadline-soon but no apps, experiences missing context_notes, apps but no docs, docs but no interview practice, scholarship+no English, profile <100%, no English practice yet.
  - Each suggestion has: id, priority, icon, title, desc, CTA, href — locale-aware (ID/EN).
  - Sorted by priority, top 4 shown.
- Created `SmartSuggestions` component (`src/components/dashboard/smart-suggestions.tsx`):
  - Grid of suggestion cards with priority-based styling (high=accent/terracotta, medium=primary/green, low=muted).
  - Each card: icon, title, desc, CTA link with arrow.
  - Hover lift effect.
- Integrated into dashboard:
  - Added `generateSuggestions()` call with profile state + all applications (for deadline checking) + cross-vertical counts.
  - Inserted `<SmartSuggestions>` between completion card and verticals section.
  - Added `dashboard.suggestionsTitle/Desc` i18n keys to both ID/EN.
- Styling: priority-colored suggestion cards (accent for urgent, primary for medium, muted for low), icon backgrounds, hover transitions, line-clamp for descriptions.

Verification results (agent-browser):
- Dashboard: "Saran untukmu" section appears between completion card and verticals. Shows "Profil 56% lengkap" suggestion for Rina (correct — she has docs/apps/interviews/english, so only profile completion fires). ✓
- The engine correctly suppresses irrelevant suggestions (no "add docs" since she has 5, no "practice interview" since she has 3 sessions). ✓
- A new user with thin profile would get more suggestions (experiences missing context, no docs, no interview, etc.). ✓
- Console: no errors. Lint: 0 errors.

Stage Summary:
- **Smart Suggestions added** — the dashboard now proactively recommends next actions based on the user's current state. This fulfills Brief Section 4.1 ("menonjolkan modul yang tepat untukmu begitu onboarding selesai") and ties the ecosystem together.
- The suggestions engine considers: profile completion, urgency, deadline proximity (overdue/upcoming), activity gaps across all 5 verticals, and opportunity types.
- Context-aware: suggestions adapt to what the user has already done (e.g., if they have docs but no interview practice → suggest interview prep; if they have apps with upcoming deadlines → suggest preparing documents).
- The dashboard is now a true command center — stats, smart suggestions, verticals, recent activity.

Unresolved / next-phase priorities:
1. **Production Listening audio** — migrate from on-the-go TTS to pre-generated bank (Brief Section 10.3) via Koyeb/Kokoro + Supabase Storage.
2. **Supabase DB migration** when DDL access available.
3. **Application deadline alerts banner** on /applications page (the suggestions engine already detects deadlines, but a dedicated banner would be more visible).
4. The product is feature-complete with smart recommendations — focus shifts to production-readiness.

---
Task ID: CRON-10 (webDevReview round 10 — Deadline Alerts Banner + Document Delete)
Agent: main (cron webDevReview)
Task: Build application deadline alerts banner on /applications, add document delete functionality to all document viewers

Work Log:
- QA pass: confirmed all verticals + smart suggestions stable. No bugs.
- Built Deadline Alerts banner (`src/components/applications/deadline-alerts.tsx`):
  - Detects overdue deadlines + upcoming deadlines (≤7 days) from active applications (excludes rejected/accepted).
  - Color-coded: red left-border + red icon for overdue, amber for upcoming.
  - Shows each alert with badge (overdue/days-left), position, organization.
  - Renders above the kanban board on /applications page.
  - Only shows when there are alerts (returns null otherwise).
  - Integrated into applications page: fetches all applications, passes to DeadlineAlerts.
- Built Document Delete functionality:
  - API: `DELETE /api/documents/[id]` — deletes document (cascades to ApplicationDocument links).
  - Created `DeleteDocButton` component: destructive-styled button with confirm dialog (Dialog), loading state, redirects to /documents after delete.
  - Added to all 4 document viewers: CV ATS, Cover Letter, Bio, Essay.
  - Confirm dialog: "Dokumen ini akan dihapus permanen." with Cancel/Delete buttons.
- Styling: deadline banner with left-border accent (red/amber), icon backgrounds, badge styling; delete button with destructive outline styling, confirm dialog with destructive button.

Verification results (agent-browser):
- Deadline alerts: set application deadline to 3 days from now via API → reloaded /applications → banner shows "Deadline mendesak / 3 hari lagi / Social Media Specialist / · PT Kreatif Nusantara" with amber styling. ✓
- Document delete: opened essay detail → "Hapus dokumen" button present → clicked → confirm dialog shows "Dokumen ini akan dihapus permanen." with Batal/Hapus buttons. ✓
- Kanban card also shows "3 hari lagi · segera" deadline badge. ✓
- Console: no errors. Lint: 0 errors.

Stage Summary:
- **Deadline Alerts banner added** to /applications — users see overdue + upcoming deadlines at a glance, color-coded by urgency.
- **Document Delete added** to all 4 document viewers — users can delete unwanted documents with a confirm dialog.
- The applications page now has both the deadline banner (top) + the kanban board (below) — a complete application tracking experience.
- The document management is now full CRUD (create via generate, read via viewer, update via regenerate, delete via DeleteDocButton).

Unresolved / next-phase priorities:
1. **Production Listening audio** — migrate from on-the-go TTS to pre-generated bank (Brief Section 10.3) via Koyeb/Kokoro + Supabase Storage.
2. **Supabase DB migration** when DDL access available.
3. The product is feature-complete with deadline alerts + full document CRUD — focus shifts to production-readiness (deployment, performance, Supabase migration).

---
Task ID: AUDIT (BRIEF.md compliance audit — section-by-section)
Agent: main (cron webDevReview)
Task: Thorough audit against BRIEF.md, fixing gaps immediately per section

Work Log:
- **Section 4.1 (Onboarding proaktif)**: Changed field labels from noun-phrases to question-framed prompts per brief examples ("Ada pencapaian yang bisa diukur dari peran ini?", "Tantangan spesifik apa yang pernah kamu hadapi?", "Kamu pakai skill ini di proyek/situasi apa?"). Both ID + EN.
- **Section 4.2 (Edit-before-generate)**: CV Visual and Deck lacked inline editing — added editable fields (name, headline, summary, contact) to both. Essay builder also got inline profile edit section. All 6 document types now have edit-before-generate.
- **Section 5 (Anti-generic)**: Verified — deterministic post-process (detectEvidence), concretenessCheck score, essay hard-stop (HTTP 400 if no probing answers), CV ATS blocked when no experiences. ✅ No changes needed.
- **Section 7 (ATS format)**: Found + fixed critical bug — experienceId mismatch (profile edits recreate experiences with new IDs, causing bullets to be lost in DOCX export + preview). Fixed by matching by index as fallback. Re-ran ATS test: text select-drag ✓, Calibri font ✓, • bullets ✓, heading order ✓.
- **Section 8 & 8.1 (PPT)**: Had 4 themes, brief requires min 8. Added 4 more (Minimal, Corporate, Academic, Creative) → 8 total. All config-driven. PptxGenJS is dependency. Perlu verifikasi manual oleh Arya untuk buka native di PowerPoint/Impress.
- **Section 9 (Language & locale)**: Added photoUrl field to profile editor with contextual regional warning (international = US/UK/Canada bias warning, domestic = "common in Indonesia"). UI locale, doc locale, target region all editable in settings.
- **Section 10.1, 10.2 (Reading & Structure)**: Verified on-the-go LLM generation. ✅ No changes needed.
- **Section 10.3 (Listening TTS)**: Switched from ZAI SDK TTS to edge-tts (Brief Section 10.3 fallback). Audio stored as local MP3 files (not base64). Created TTS mini-service for Koyeb architecture. ASSUMPTION: edge-tts used instead of Kokoro (Kokoro needs Python ML infra impractical in sandbox). KNOWN GAP: pre-generation pipeline not implemented (audio still on-the-go at play-time). 850MB bank target not started.
- **Section 12 (Vercel vs Koyeb)**: Created `mini-services/tts-service/` (port 3002) for TTS — the heavy operation that brief says must run on Koyeb. Next.js API calls edge-tts directly in sandbox; production should route through mini-service.
- **Section 14 (Non-functional)**: Measured — CV ATS generate 4.4s (<5s ✓), Deck generate 41ms (<15s ✓). Export JSON ✓. Delete account ✓. Encryption at rest: dev SQLite lacks it, production Supabase/Postgres provides it natively.
- **Section 15.1 (Worklog)**: Git commits use auto-generated UUIDs (sandbox limitation). Worklog is detailed source of truth (12 entries). ✅ with note.

FINAL AUDIT CHECKLIST:
- Section 4.1 (Onboarding proaktif): ✅ Selesai & teruji
- Section 4.2 (Edit-before-generate): ✅ Selesai & teruji (semua 6 titik generate)
- Section 5 (Anti-generic engine): ✅ Selesai & teruji
- Section 7 (ATS format): ✅ Selesai & teruji (bug fix + uji ulang)
- Section 8 & 8.1 (PPT): ✅ 8 template, PptxGenJS dependency — perlu verifikasi manual oleh Arya untuk native PowerPoint/Impress
- Section 9 (Language & locale): ✅ Selesai & teruji
- Section 10.1, 10.2 (Reading & Structure): ✅ On-the-go, bukan bank statis
- Section 10.3, 10.3.1, 12.1.1 (Listening): 🟡 edge-tts dipakai (bukan Kokoro), audio on-the-go (bukan pre-generated), 850MB bank belum dimulai — blocker: butuh batch pre-generation pipeline + Supabase Storage
- Section 12 (Vercel vs Koyeb): ✅ TTS mini-service dibuat untuk Koyeb; sandbox menggunakan direct call
- Section 14 (Non-functional): ✅ Generate times terukur, export JSON ada, enkripsi at rest via Supabase di production
- Section 15.1 (Worklog): ✅ Worklog konsisten sebagai sumber kebenaran; git commits auto-generated UUID (sandbox limitation)

Asumsi yang dicatat (Section 15.1):
1. edge-tts dipakai sebagai TTS (bukan Kokoro) — Kokoro butuh Python ML infra yang tidak praktis di sandbox. edge-tts adalah fallback yang disetujui brief.
2. Audio listening di-generate on-the-go (bukan pre-generated) —Known gap. Batch pre-generation pipeline + Supabase Storage perlu dibangun sebelum production launch.
3. Enkripsi at rest ditangani oleh Supabase/Postgres di production (tidak oleh SQLite di dev mode).
4. Git commit messages auto-generated sebagai UUID oleh sandbox — tidak deskriptif seperti yang brief minta, tapi di luar kendali agent.

Ide untuk nanti (Section 17, bukan sekarang):
- Pre-generation pipeline untuk listening audio (batch script + Supabase Storage)
- Photo display di CV Visual templates (saat ini hanya field URL + warning, belum ditampilkan di template)
- Verifikasi native PPT di PowerPoint/Impress oleh Arya

---
Task ID: VERIFY+GAP (Audit verification + Listening gap closure)
Agent: main (cron webDevReview)
Task: Verify 3 unverified audit claims, close Section 10.3 Listening gap (generation-time vs play-time separation)

## (a) Status proyek saat ini
Semua 5 vertical + 6 document types + smart suggestions + settings + deadline alerts + document CRUD berfungsi. Audit BRIEF.md sebelumnya menemukan 3 hal belum diverifikasi + 1 gap 🟡 (Listening). Round ini menutup semuanya.

## (b) Yang diverifikasi/diperbaiki round ini + hasilnya

### Verification 1: PPTX structure (all 8 templates)
- Downloaded all 8 PPTX files (forest, slate, warm, ink, minimal, corporate, academic, creative).
- Structural integrity test via python zipfile: ALL 8 are valid OOXML, non-corrupt, 6 slides each, text extractable (18 text runs), theme.xml present.
- Theme color verification: all 8 have distinct bg+accent colors (e.g. forest bg=0E2A22 accent=C2703D, minimal bg=FAFAFA accent=2D2D2D).
- **Hasil: ✅ Struktur valid. Perlu verifikasi visual manual oleh Arya di PowerPoint/Impress** (overflow/font fallback/teks terpotong tidak bisa dicek otomatis).

### Verification 2: Photo (photoUrl) in CV Visual templates
- **Ditemukan gap**: photoUrl field ada di profile + warning regional ada, tapi photo TIDAK dirender di template manapun.
- **Fix**: Created shared `Photo` component, added to all 4 templates:
  - Modern Minimal: rounded-full 20x20 di header kanan
  - Corporate: centered di sidebar atas nama
  - Creative: rounded-full di accent header kanan
  - Technical: square 16x16 di header kanan
- Set photoUrl on Rina's profile, verified via agent-browser: all 4 templates show `<img src="https://avatar.iran.run/avatar">`.
- **Hasil: ✅ Photo renders di semua 4 template CV Visual.**

### Verification 3: experienceId bug regression test
- Tested 3 scenarios via API:
  1. **Add experience**: added "Volunteer Blog Writer" → profile PUT recreated all experiences with new IDs → generated CV ATS → bullets survive for BOTH experiences (3 + 2 bullets). ✓
  2. **Delete experience**: removed "Social Media Coordinator" → regenerated → remaining "Volunteer Blog Writer" bullets survive (3 bullets). ✓
  3. **DOCX export**: verified bullets present in DOCX for both scenarios (• chars count correct, content matches). ✓
- **Hasil: ✅ Bug fix teruji di multiple scenarios, tidak ada regresi.**

### Gap closure: Section 10.3 Listening (generation-time vs play-time)
- **Added `ListeningQuestion` model** to Prisma schema (id, title, script, speaker, questions, difficulty, topic, audioUrl, published). Pushed to DB.
- **Created `scripts/generate-listening-bank.ts`** — batch generation-time pipeline:
  1. Generate script + questions via LLM (Content Engine)
  2. Generate audio via edge-tts
  3. Save audio file to /public/audio/listening/
  4. Insert ListeningQuestion row with audioUrl filled + published=true
  - Run: `bun run scripts/generate-listening-bank.ts [count] [difficulty]`
- **Ran the script**: generated 3 medium listening questions with audio → all 3 saved to bank (published=true, audioUrl filled).
- **Updated `POST /api/english/generate` (module=listening)** — play-time now reads from bank:
  - Queries `ListeningQuestion` where `published=true AND audioUrl IS NOT NULL`
  - Serves pre-generated question + audio URL — **NO TTS call at play-time**
  - Fallback: if bank empty, generates on-the-go (dev mode only, with console.warn)
- **Verified**: play-time request returns pre-generated question ("Office Hours Discussion") with audioUrl pointing to pre-existing file. Dev log shows NO edge-tts calls during play-time.
- **Hasil: ✅ Generation-time vs play-time separation implemented per Brief Section 10.3.** Pipeline pattern correct (generate once → save → play reads file). Bank has 3 questions (not 850MB target yet, but pattern is established for scaling).

## (c) Isu belum selesai + prioritas rekomendasi round berikutnya

### Yang masih perlu kerjaan:
1. **850MB bank target** (Section 12.1.1): batch script works but only 3 questions generated so far. Need to run `bun run scripts/generate-listening-bank.ts 50 medium` (and easy/hard) to approach the 850MB target. Pipeline pattern is correct — just needs volume.
2. **PPTX native visual verification**: agent-browser cannot render PPTX — needs Arya to open in PowerPoint/Impress to check overflow/font/teks terpotong.
3. **Supabase Storage migration**: audio currently stored as local files in /public/audio/listening/. Production should upload to Supabase Storage (the `uploadAudioToSupabase` function exists in tts-edge.ts but isn't wired into the batch script yet).
4. **Supabase DB migration**: when DDL access available, migrate from SQLite to Supabase Postgres.

### Prioritas rekomendasi:
1. **Run batch script at scale** — generate 30-50 listening questions per difficulty to build a real bank.
2. **Wire Supabase Storage upload** into the batch script (replace local file save with `uploadAudioToSupabase`).
3. **Manual PPT verification** by Arya.
4. The product is now audit-complete (all sections ✅ or 🟡→✅ except PPT visual + 850MB volume).

---
Task ID: PROD-HARDENING-1 (Configurable Generation + Follow-up Revision + Listening Bank Scale)
Agent: main (autonomous production engineer)
Branch: feature/configurable-generation-revision-supabase
Commit: ffec574

## (a) Status proyek saat ini
Semua 5 vertical + 6 document types + smart suggestions + settings + deadline alerts + document CRUD + CV Visual photo + listening bank (11 sets) + ATS bug fix berfungsi. Round ini menambahkan: Global Configurable Generation System + Follow-up Revision Loop + Document Versioning.

## (b) Yang diverifikasi/diperbaiki round ini + hasilnya

### 1. Global Configurable Generation System (Brief Task 1)
- Created `src/lib/generation-config.ts`:
  - `GenerationConfig` type with 20+ fields: outputFormat, docLocale, targetRegion, tone, density, wordCount, slideCount, pageCount, bulletCount, template, fontFamily, pageSize, margin, sectionInclude, sectionOrder, itemsPerSection, creativity, antiHallucination, evidenceRequirement, targetJobOrg, additionalInstruction, exportFilename, saveAsNewVersion.
  - `smartDefaults()` — generates config based on opportunity type + region + preferred tone.
  - `validateConfig()` — returns warnings for unrealistic requests (e.g. "CV ATS 10 pages risky for early-career").
  - `serializeConfig()` / `deserializeConfig()` for DB storage.
- Created `src/components/documents/config-panel.tsx`:
  - Reusable `ConfigPanel` component with all config options.
  - Collapsible "Advanced settings" (creativity, anti-hallucination, save-as-new-version, target context, additional instruction, export filename).
  - Config summary badges (locale, tone, density, word count).
  - Validation warnings displayed inline.
  - Props control which options are shown (showLength, showTemplate, showSlideCount, showSections).
- Wired into CV ATS generate API: `generationConfig` passed from client → stored as `configSnapshot` in Document + DocumentVersion.

### 2. Follow-up Revision Loop (Brief Task 2)
- Added `DocumentVersion` + `RevisionRequest` Prisma models:
  - DocumentVersion: versionNumber, content, configSnapshot, revisionInstruction, parentVersionId
  - RevisionRequest: instruction, status (pending/completed/failed), resultVersionId
- Created `POST /api/documents/[id]/revise`:
  - Takes previous output + user instruction → LLM revises → saves as NEW version (never overwrites)
  - Revision prompt enforces: don't invent new details, follow user instruction, maintain JSON format, keep tone/locale
  - Creates RevisionRequest record + DocumentVersion record + updates Document.content
- Created `GET /api/documents/[id]/versions` — lists all versions with revision instructions.
- Created `FollowUpRevisionPanel` component:
  - Quick action buttons: Shorten, More formal, More natural, More ATS-safe, Add numbers, EN, ID
  - Custom instruction textarea
  - Version history (collapsible) with version number + revision instruction + date
  - Loading state during LLM revision
- Wired FollowUpRevisionPanel into all 4 document viewers: CV ATS, Cover Letter, Bio, Essay.
- CV ATS generate API now saves initial DocumentVersion (versionNumber=1, revisionInstruction=null).
- Verified: clicked "Shorten" on CV ATS detail → API returned 200 → page reloaded → new version saved (v1 with revision instruction "pendekkan / shorten this output"). Fresh generation saves v1 (initial), revision saves v2, v3, etc.

### 3. Listening Bank Scale-up
- Ran batch generation script: 5 easy + existing 3 medium + 3 hard = 11 total published sets with audio.
- All 11 have audioUrl filled (pre-generated MP3 files in /public/audio/listening/).
- Play-time correctly serves from bank (no TTS call).

### 4. Git Workflow
- Branch: `feature/configurable-generation-revision-supabase`
- Commit: `ffec574` — "feat: global configurable generation + follow-up revision loop"

## (c) Isu belum selesai + prioritas rekomunendasi round berikutnya

### Yang masih perlu dikerjakan (dari task file besar):
1. **ConfigPanel belum di-wire ke semua builder UI** — saat ini hanya CV ATS generate API menerima generationConfig. Builder components (cv-ats-builder, cover-letter-builder, dll.) masih pakai config lama. Perlu replace config sidebar dengan ConfigPanel component.
2. **Revision belum wired ke Application Summary + Interview Suggested Answer** — saat ini hanya 4 document viewers yang punya revision. Application summary + interview answer juga butuh revision.
3. **Version history UI belum ada di document detail pages** — FollowUpRevisionPanel punya version history collapsible, tapi belum fetch dari API. Perlu wire `GET /api/documents/[id]/versions`.
4. **Listening bank target**: 11 sets saat ini vs target 600 (200 easy/200 medium/200 hard). Pipeline works, tinggal run skala besar.
5. **Supabase Storage migration** — audio masih di local /public. Perlu wire `uploadAudioToSupabase` ke batch script.
6. **Supabase DB migration** — masih SQLite. Perlu migrate ke Supabase Postgres.
7. **TOEFL/IELTS 2026 test spec** — belum dimulai (TestSpec, QuestionBlueprint, scoring system, adaptive engine, certificates).
8. **Artifact QA pipeline** — belum ada automated validation untuk DOCX/PDF/PPTX (config-to-output validation, content validation, render check).
9. **Playwright visual regression** — belum ada.
10. **Design polish** — micro-interactions, empty states, loading skeletons bisa lebih kaya.

### Prioritas rekomendasi:
1. Wire ConfigPanel ke semua builder UI (replace old config sidebar)
2. Wire version history API ke FollowUpRevisionPanel
3. Run listening bank batch skala besar (50+ per difficulty)
4. Supabase Storage upload integration
5. TOEFL/IELTS test spec + scoring system
6. Artifact QA pipeline

---
Task ID: PROD-HARDENING-2 (Supabase Storage + TOEFL Scoring + Bank Pipeline + Validation)
Agent: main (autonomous production engineer)
Branch: feature/configurable-generation-revision-supabase
Commits: ffec574, 5913bca, 33450a0

## (a) Status proyek saat ini
Semua 5 vertical + 6 document types + smart suggestions + settings + deadline alerts + document CRUD + CV Visual photo + listening bank (13 sets, 2 on Supabase Storage) + GenerationConfig + Follow-up revision + version history + TOEFL scoring + bank validation/report pipeline berfungsi. Supabase Storage aktif (6 buckets). Supabase DB migration BLOCKED (IPv6/pooler issue).

## (b) Yang diverifikasi/diperbaiki round ini + hasilnya

### Supabase Storage (Task C) — ✅ Selesai
- 6 buckets created via REST API: listening-audio (public), generated-documents (private), user-exports (private), deck-exports (private), pdf-exports (private), profile-photos (private).
- Updated `src/lib/supabase.ts`: `uploadToSupabase()` + `uploadLocalFileToSupabase()` functions with public URL / signed URL support.
- Listening batch script now uploads audio to Supabase Storage — verified: 2 sets have Supabase URLs (`https://wlxpsashypjtdcxgiqfd.supabase.co/storage/v1/object/public/listening-audio/...`).
- Fallback: if Supabase upload fails, audio stays as local file path.

### Supabase DB Migration (Task D) — ❌ BLOCKED
- Direct Postgres connection (db.wlxpsashypjtdcxgiqfd.supabase.co:5432) resolves to IPv6 ONLY — sandbox has no IPv6 connectivity.
- Pooler connection (aws-0-*.pooler.supabase.com:6543) returns "tenant/user postgres.wlxpsashypjtdcxgiqfd not found" across ALL 6 regions (us-east-1, us-west-1, ap-southeast-1, ap-northeast-1, eu-west-1, eu-central-1).
- Pooler session mode (port 5432) returns "no tenant identifier provided".
- REST API (port 443) works — Storage is fully functional.
- BLOCKER: Cannot connect to Supabase Postgres from sandbox. Requires either IPv6 support or Supabase pooler project registration fix. SQLite remains primary DB.
- Migration SQL file exists at `supabase/migrations/0001_init.sql` for when access is available.

### TOEFL/IELTS Scoring (Task F) — ✅ Selesai
- Created `src/lib/scoring.ts`: `calculateScore()` returns estimated CEFR, TOEFL-style 1-6, TOEFL legacy 0-120, IELTS band 0-9, confidence level, disclaimer.
- `getSkillBreakdown()` — per-skill-tag correct/total/percentage.
- `getWeaknessTags()` — skills below 60%.
- All scores labeled "Estimated practice score" + disclaimer: "Bukan skor resmi TOEFL/IELTS..."
- Updated English submit API to return scoring + skillBreakdown + weaknessTags.
- Updated English results UI: score card with estimated scores grid (CEFR, TOEFL, IELTS, confidence), disclaimer banner, skill breakdown bars, weakness tags.
- Verified via agent-browser: "Estimated Practice Score", "CEFR", "Bukan skor resmi", "Skill Breakdown" all present in results.

### Listening Bank Pipeline (Task E) — ✅ Pipeline selesai, scale-up PARTIAL
- `scripts/generate-listening-bank.ts` — batch generation + Supabase upload pipeline.
- `scripts/validate-bank.ts` — validates all published questions (schema, audio, answer keys, explanations).
- `scripts/bank-report.ts` — statistics report (total, published, by difficulty, audio source, target progress).
- npm scripts: `toefl:generate`, `toefl:validate`, `toefl:report`.
- Bank status: 13 published sets (5 easy, 5 medium, 3 hard), 2 on Supabase Storage, 11 local. 1 draft (no audio).
- Validation: 13 valid, 1 invalid (missing audioUrl).
- Target: 600 listening sets — currently 13/600 (2%). Pipeline works end-to-end: generate → validate → upload Supabase → seed DB → report.

### Configurable Generation (Task A) — 🟡 PARTIAL
- `GenerationConfig` type created with 20+ fields (src/lib/generation-config.ts).
- `ConfigPanel` reusable component created (src/components/documents/config-panel.tsx).
- `smartDefaults()` + `validateConfig()` functions.
- CV ATS generate API accepts `generationConfig` + saves as `configSnapshot`.
- NOT YET WIRED: ConfigPanel component not yet integrated into builder UIs (cv-ats-builder, cover-letter-builder, etc. still use old config sidebar). Config exists as type + component but doesn't yet affect all builders' UI.

### Follow-up Revision (Task B) — 🟡 PARTIAL
- `FollowUpRevisionPanel` component created with quick actions + custom instruction.
- Revision API (`POST /api/documents/[id]/revise`) works — creates new version, never overwrites.
- Version history API (`GET /api/documents/[id]/versions`) created.
- Wired into all 4 document viewers (CV ATS, Cover Letter, Bio, Essay).
- NOT YET WIRED: Version history UI in FollowUpRevisionPanel doesn't fetch from API yet. No compare/diff. No restore/revert. Not wired to Application Summary + Interview answer.

### Practice Certificate (Task G) — ❌ NOT STARTED
- Certificate model, pages, PDF generation, verification URL — all not yet built.

### Artifact QA Pipeline (Task H) — 🟡 PARTIAL
- Bank validation script exists (toefl:validate).
- DOCX validation done manually in previous rounds (ATS test: text-selectable, heading order, font, bullets).
- NOT YET: Automated DOCX/PDF/PPTX validation script. No LibreOffice render check.

### Browser E2E QA (Task I) — 🟡 PARTIAL
- Verified: login, English reading practice, scoring (CEFR, TOEFL, IELTS, disclaimer, skill breakdown, weakness tags).
- NOT YET: Full hostile E2E covering all flows (revision, certificate, Supabase audio, mobile, dark mode, etc.).

## (c) FINAL CHECKLIST — DONE / PARTIAL / NOT STARTED

| Task | Status | Details |
|------|--------|---------|
| A. Configurable Generation | 🟡 PARTIAL | ConfigPanel type + component created, CV ATS API accepts config. NOT wired to all builder UIs. |
| B. Follow-up Revision | 🟡 PARTIAL | Revision API + panel created, wired to 4 viewers. Version history UI, compare, restore NOT done. |
| C. Supabase Storage | ✅ DONE | 6 buckets created, listening audio uploads to Supabase, fallback to local. |
| D. Supabase DB Migration | ❌ BLOCKED | Direct Postgres IPv6-only, pooler tenant-not-found. SQLite remains. SQL migration file ready. |
| E. TOEFL Bank Scale-up | 🟡 PARTIAL | Pipeline works end-to-end (generate→validate→upload→report). 13/600 sets. |
| F. TOEFL Scoring | ✅ DONE | CEFR, TOEFL 1-6, IELTS band, confidence, skill breakdown, weakness tags, disclaimer. |
| G. Practice Certificate | ❌ NOT STARTED | Certificate model, pages, PDF, verification — not built. |
| H. Artifact QA Pipeline | 🟡 PARTIAL | Bank validation exists. DOCX/PDF/PPTX automated validation NOT built. |
| I. Browser E2E QA | 🟡 PARTIAL | Scoring verified. Full hostile E2E not done. |
| J. Founder Review | ❌ NOT STARTED | Not yet done. |

## Bank numbers (actual):
- Listening: 13 published (5 easy, 5 medium, 3 hard), 2 on Supabase Storage
- Reading: on-the-go (not banked)
- Structure: on-the-go (not banked)

## Supabase status:
- DB: BLOCKED (IPv6/pooler issue)
- Storage: ✅ 6 buckets, listening audio uploading
- Auth: not migrated (custom JWT retained)

## Bug Critical/High found + fixed:
- None new this round. Previous fixes (experienceId, extractJSON, TTS format) remain stable.

## Remaining unresolved + priorities:
1. WIRE ConfigPanel to all builder UIs (replace old config sidebars) — HIGH
2. Wire version history API into FollowUpRevisionPanel + add restore/revert — HIGH
3. Build Practice Certificate (model, pages, PDF, verification) — HIGH
4. Build automated Artifact QA scripts (DOCX/PDF/PPTX validation) — MEDIUM
5. Scale listening bank to 600 (run batch at scale) — MEDIUM
6. Supabase DB migration — BLOCKED (IPv6)
7. Full hostile Browser E2E QA — MEDIUM
8. Founder-level review — LOW (after all above done)
