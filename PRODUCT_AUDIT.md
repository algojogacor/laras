# Laras — Product Audit (Founder-Level Review)

**Tanggal:** 2026-07-10
**Reviewer:** main agent (acting as Founder & Head of Product)
**Commit:** `8605709`

---

## Positioning Laras Saat Ini

Laras adalah **"Career & Opportunity Readiness Ecosystem"** — platform terintegrasi yang membantu pengguna Indonesia (terutanya fresh graduate, career switcher, dan pelamar beasiswa) menyiapkan diri untuk peluang karier/akademik dengan output yang siap pakai.

**Value proposition inti:** "Satu profil, lima vertical, semua dokumen dan latihan yang kamu butuhkan untuk siap melamar — dihasilkan dari konteks pribadimu, bukan template generik."

**Positioning vs kompetitor:**
- vs Canva/Novoresume: Laras fokus konten (bukan desain), ATS-compliant, dan terintegrasi dengan latihan English + interview prep.
- vs ChatGPT langsung: Laras terstruktur (5 vertical), menyimpan versi, dan punya profil sebagai source of truth — bukan prompt sekali pakai.
- vs TOEFL/IELTS resmi: Laras memberikan latihan tak terbatas dengan estimasi skor + sertifikat latihan (dengan disclaimer jelas).

---

## Target Pengguna Utama

1. **Fresh graduate Indonesia** (20-25 thn) — butuh CV ATS, cover letter, latihan interview, dan English practice untuk melamar kerja pertama.
2. **Career switcher** (26-35 thn) — butuh reformulasi pengalaman ke narasi baru, latihan interview teknis.
3. **Pelamar beasiswa/pendidikan lanjut** — butuh essay, CV akademik, sertifikat English (sebagai indikator latihan, bukan pengganti ujian resmi).

**Sekunder:** Job seeker umum yang ingin dokumen lebih tajam dan latihan terstruktur.

---

## Masalah Utama yang Diselesaikan

1. **Dokumen generik tidak lolos ATS / tidak menonjol** — Laras pakai profil pribadi + anti-generic engine.
2. **Latihan English mahal dan tidak terstruktur** — Laras beri latihan unlimited dengan estimasi skor.
3. **Interview prep tidak terjangkau** — Laras generate pertanyaan + feedback AI per jawaban.
4. **Fragmentasi tools** — CV di Canva, cover letter di ChatGPT, latihan di Duolingo, interview di YouTube. Laras satukan.
5. **Tidak ada versioning** — Laras simpan setiap versi dokumen, bisa restore.

---

## Fitur Inti

| Vertical | Fitur | Status |
|---|---|---|
| 1. Document Builders | CV ATS, CV Visual, Cover Letter, Bio, Essay, Deck (PPT) | ✅ Semua 6 selesai |
| 2. English Practice | Reading, Structure, Listening + Sertifikat | ✅ Reading/Structure done, Listening bank partial (13/600) |
| 3. Applications Tracker | Kanban 6 kolom + AI summarize + deadline alerts | ✅ Selesai |
| 4. Interview Prep | 6 pertanyaan + feedback AI per jawaban | ✅ Selesai |
| 5. Profile/Onboarding | 5-step wizard + profil 8 section + completion gauge | ✅ Selesai |

**Fitur pendukung:**
- i18n (ID/EN) ✅
- Version history + revision requests ✅
- Smart suggestions ✅
- Settings (locale, tone, region, urgency) ✅
- Public certificate verification ⚠ (bug P1: diblokir proxy)

---

## Bagian Produk yang Paling Kuat

1. **Profil sebagai single source of truth** — semua 5 vertical pakai data sama. Update profil sekali, semua dokumen lebih tajam.
2. **Anti-generic engine** — `contextNotes` di Experience, `context` di Skill, probing Q&A di Essay. Mencegah output boilerplate.
3. **Version history + restore** — setiap revisi buat versi baru, tidak pernah overwrite. Bisa restore versi lama.
4. **ATS-compliant DOCX** — Calibri, 0.75" margin, one column, MM/YYYY dates. Beneran lolos ATS.
5. **Estimasi skor TOEFL/IELTS/CEFR** — bukan random; pakai scoring engine dengan skill breakdown + weakness tags.
6. **Disclaimer sertifikat jelas** — "Bukan sertifikat resmi TOEFL/IELTS" —合规 dan jujur.

---

## Bagian Produk yang Paling Lemah

1. **Listening bank belum scale** — hanya 13/600 set. UX terpakai, tapi repetisi cepat.
2. **ConfigPanel tidak terhubung** — komponen konfigurasi generation ada tapi tidak dipakai. User tidak bisa kontrol tone/length/target.
3. **Command palette placeholder** — built tapi tidak render. Misi "power-user" belum tercapai.
4. **Notification center tidak ada** — deadline alerts hanya di page Applications, tidak ada push/notif pusat.
5. **Mobile nav broken** — AppHeader tidak ada hamburger menu. Mobile user tidak bisa navigasi.
6. **Public verify page broken** — fitur unggulan (verifikasi sertifikat publik) rusak karena proxy.
7. **Zero automated tests** — regression risk tinggi saat refactor.
8. **Type errors 372** — technical debt yang masking bug potensial.

---

## User Journey yang Belum Lengkap

1. **Onboarding → First document:** Tidak ada guide/tutorial setelah onboarding. User langsung diarahkan ke dashboard tanpa "what next".
2. **Document → Application linking:** Bisa link dokumen ke application, tapi tidak ada reverse flow (dari application, "generate cover letter for this JD").
3. **Interview prep → Feedback history:** Feedback per jawaban disimpan, tapi tidak ada summary "weakness areas across all interview sets".
4. **English practice → Weakness → Targeted practice:** Skor breakdown ada, tapi tidak ada "practice more on [weak area]" CTA.
5. **Profile completion → Suggestion:** Completion gauge ada, tapi tidak ada "add X to reach Y%" micro-copy.
6. **Mobile experience:** Nav broken, belum ada PWA (bisa di-install), belum ada offline mode.

---

## Fitur yang Belum Memberikan Nilai

1. **Command palette** — built tapi tidak render. Dead code sampai di-wire.
2. **ConfigPanel** — built tapi tidak terhubung. User tidak bisa pakai.
3. **TTS mini-service** — desain untuk Koyeb deploy tapi app langsung call `python3 edge-tts` via `execSync`. Mini-service tidak dipakai.
4. **examples/websocket/** — reference Socket.IO, tidak terhubung ke app.
5. **Dead deps: next-auth, next-intl** — terinstall tapi tidak dipakai.

---

## Kemungkinan Penyederhanaan

1. **Hapus next-auth & next-intl** dari dependencies (dead code).
2. **Hapus examples/websocket/** sampai ada rencana real-time feature.
3. **Pilih: TTS mini-service ATAU direct execSync** — jangan keduanya. Direct execSync lebih sederhana untuk sekarang.
4. **Konsolidasi error handling** — buat central error envelope untuk semua API route.
5. **Hapus ConfigPanel sampai siap di-wire** ATAU wire segera (pilih satu, jangan biarkan setengah jadi).

---

## Peluang Diferensiasi

1. **"Opportunity Readiness Score"** — composite metric dari profile completion + document freshness + English practice + interview prep. Single number yang menunjukkan "seberapa siap kamu melamar". Kompetitor tidak punya ini.
2. **JD → Tailored document pipeline** — paste JD, Laras generate CV + cover letter + interview questions yang tailored. Sekarang fragmented.
3. **Mock interview audio** — voice-to-voice interview practice (TTS sudah ada, tinggal wire STT).
4. **Document cross-check** — "Cover letter kamu sebutkan skill X, tapi CV tidak. Konsisten?"
5. **Alumni network verify** — verifikator sertifikat bisa lihat "Laras graduate" badge.
6. **Indonesia-specific:** Lowongan BUMN, CPNS, Beasiswa LPDP — template khusus.

---

## Risiko Produk

1. **Listening bank tidak scale** — user cepat habis 13 set, repeat rate turun.
2. **LLM cost-abuse** — tanpa rate limit, 1 user bisa habiskan kuota LLM harian.
3. **Trust gap** — sertifikat latihan bisa dikira sertifikat resmi jika disclaimer tidak cukup jelas (sudah ada, tapi perlu A/B test).
4. **Mobile churn** — mobile nav broken → user mobile bounce.
5. **No offline mode** — internet mati = app mati. PWA bisa bantu.

---

## Risiko Teknis

1. **372 type errors** — `ignoreBuildErrors: true` masking bug.
2. **Schema drift** — 4 tabel di DB tidak ada di Prisma. `prisma db push` bisa hapus data.
3. **No rate limiting** — brute-force + cost abuse.
4. **No error boundaries** — unhandled error = white screen.
5. **No tests** — refactor berisiko tinggi.
6. **Custom JWT auth** — tidak ada refresh token, tidak ada MFA, tidak ada password reset.
7. **Supabase keys placeholder** — fitur upload file tidak jalan sampai diisi.

---

## Rekomendasi Prioritas

### Immediate (P0/P1 — blocking production):
1. Fix public verify page proxy bug (BUG-001) — 1 line fix, impact besar.
2. Add rate limiting (BUG-002) — protect LLM cost + auth brute-force.
3. Add error.tsx/loading.tsx/not-found.tsx/global-error.tsx (BUG-003) — UX baseline.
4. Remove `ignoreBuildErrors: true` (BUG-004) — setelah type errors diperbaiki.
5. Fix mobile nav (BUG-007) — 60%+ user mobile.

### Short-term (P2 — quality):
6. Fix 372 type errors (BUG-008) — mulai dengan dictionary.ts (364 errors).
7. Add getSession() to /api/applications/summarize (BUG-005).
8. Sanitize error messages (BUG-006).
9. Wire ConfigPanel to builders ATAU hapus.
10. Render CommandDialog ATAU hapus.

### Medium-term (P3 — polish & growth):
11. Scale listening bank (13 → 600).
12. Add automated tests (Vitest + Playwright).
13. Add PWA manifest + service worker.
14. Add "Opportunity Readiness Score" (diferensiasi).
15. Wire TTS mini-service untuk production (atau hapus).

### Long-term (exploration):
16. Voice-to-voice mock interview.
17. JD → full tailored pipeline.
18. Indonesia-specific templates (CPNS, LPDP, BUMN).
19. Alumni network / badge system.
