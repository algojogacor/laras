import type { UserProfile, Experience, Application } from "@prisma/client"

/**
 * Smart Suggestions engine (Brief Section 4.1 — "menonjolkan modul yang tepat").
 * Generates context-aware next-action recommendations based on the user's
 * current state: profile completeness, urgency, deadline proximity, activity gaps.
 */

export type Suggestion = {
  id: string
  priority: "high" | "medium" | "low"
  icon: "alert" | "sparkles" | "clock" | "target" | "book" | "check"
  title: string
  desc: string
  cta: string
  href: string
}

type SuggestionInput = {
  profile: {
    fullName: string | null
    headline: string | null
    summary: string | null
    email: string | null
    phone: string | null
    location: string | null
    preferredTone: string | null
    urgency: string | null
    opportunityTypes: string | null
    targetExamScore: string | null
    profileCompletion: number
  }
  experiences: Experience[]
  skillsCount: number
  docCount: number
  appCount: number
  interviewCount: number
  englishCount: number
  applications: Pick<Application, "id" | "position" | "organization" | "status" | "deadline">[]
}

const isID = (locale: string) => locale === "id"

export function generateSuggestions(input: SuggestionInput, locale: "id" | "en"): Suggestion[] {
  const id = isID(locale)
  const out: Suggestion[] = []
  const p = input.profile

  // ── HIGH PRIORITY ──

  // 1. Overdue application deadlines
  const now = new Date()
  const overdue = input.applications.filter((a) => {
    if (!a.deadline || a.status === "rejected" || a.status === "accepted") return false
    const d = new Date(a.deadline)
    return !isNaN(d.getTime()) && d < now
  })
  if (overdue.length > 0) {
    out.push({
      id: "overdue-deadline",
      priority: "high",
      icon: "alert",
      title: id ? `${overdue.length} lamaran sudah lewat deadline` : `${overdue.length} application${overdue.length > 1 ? "s" : ""} past deadline`,
      desc: id ? `Periksa status: ${overdue[0].position}` : `Check status: ${overdue[0].position}`,
      cta: id ? "Lihat lamaran" : "View applications",
      href: "/applications",
    })
  }

  // 2. Upcoming deadlines (within 7 days)
  const upcoming = input.applications.filter((a) => {
    if (!a.deadline || a.status === "rejected" || a.status === "accepted") return false
    const d = new Date(a.deadline)
    if (isNaN(d.getTime()) || d < now) return false
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff <= 7
  })
  if (upcoming.length > 0) {
    const a = upcoming[0]
    const d = new Date(a.deadline!)
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    out.push({
      id: "upcoming-deadline",
      priority: "high",
      icon: "clock",
      title: id ? `Deadline ${diff} hari lagi: ${a.position}` : `Deadline in ${diff} day${diff > 1 ? "s" : ""}: ${a.position}`,
      desc: id ? `Siapkan dokumen lamaran untuk ${a.organization || "posisi ini"}` : `Prepare application documents for ${a.organization || "this position"}`,
      cta: id ? "Siapkan dokumen" : "Prepare documents",
      href: "/documents/cv-ats/new",
    })
  }

  // 3. Urgency = deadline-soon but no applications yet
  if (p.urgency === "deadline-soon" && input.appCount === 0) {
    out.push({
      id: "urgent-no-apps",
      priority: "high",
      icon: "target",
      title: id ? "Kamu punya deadline dekat tapi belum melamar" : "You have a near deadline but no applications yet",
      desc: id ? "Mulai lacak lamaran pertamamu" : "Start tracking your first application",
      cta: id ? "Tambah lamaran" : "Add application",
      href: "/applications",
    })
  }

  // ── MEDIUM PRIORITY ──

  // 4. Profile too thin — missing context_notes
  const expsWithoutContext = input.experiences.filter((e) => !(e.contextNotes || "").trim() && !(e.achievements || "[]").replace(/[\[\]"]/g, "").trim())
  if (expsWithoutContext.length > 0) {
    out.push({
      id: "add-context",
      priority: "medium",
      icon: "sparkles",
      title: id ? `${expsWithoutContext.length} pengalaman belum ada catatan konteks` : `${expsWithoutContext.length} experience${expsWithoutContext.length > 1 ? "s" : ""} missing context notes`,
      desc: id ? "Tambahkan detail konkret (nama proyek, angka) untuk dokumen yang lebih tajam" : "Add concrete details (project names, numbers) for sharper documents",
      cta: id ? "Lengkapi profil" : "Complete profile",
      href: "/profile",
    })
  }

  // 5. Has applications but no documents
  if (input.appCount > 0 && input.docCount === 0) {
    out.push({
      id: "apps-no-docs",
      priority: "medium",
      icon: "book",
      title: id ? "Kamu punya lamaran tapi belum buat dokumen" : "You have applications but no documents yet",
      desc: id ? "Buat CV ATS pertamamu" : "Create your first ATS CV",
      cta: id ? "Buat dokumen" : "Create document",
      href: "/documents/cv-ats/new",
    })
  }

  // 6. Has documents but no interview practice
  if (input.docCount > 0 && input.interviewCount === 0) {
    out.push({
      id: "docs-no-interview",
      priority: "medium",
      icon: "sparkles",
      title: id ? "Saatnya latihan wawancara" : "Time to practice interviews",
      desc: id ? "Buat sesi latihan untuk role yang kamu tuju" : "Create a practice session for your target role",
      cta: id ? "Latih wawancara" : "Practice interview",
      href: "/interview",
    })
  }

  // 7. Opportunity type includes scholarship but no essay
  const oppTypes = p.opportunityTypes ? JSON.parse(p.opportunityTypes) : []
  if (oppTypes.includes("scholarship") && input.docCount > 0) {
    // Check if any doc is an essay — we can't tell from counts alone, so suggest if no interview+english activity
    if (input.englishCount === 0) {
      out.push({
        id: "scholarship-english",
        priority: "medium",
        icon: "book",
        title: id ? "Persiapkan TOEFL/IELTS untuk beasiswa" : "Prepare TOEFL/IELTS for scholarships",
        desc: id ? "Latihan Reading & Structure bergaya ujian" : "Practice exam-style Reading & Structure",
        cta: id ? "Latih bahasa" : "Practice English",
        href: "/english",
      })
    }
  }

  // ── LOW PRIORITY ──

  // 8. Profile completion < 100%
  if (p.profileCompletion < 100) {
    out.push({
      id: "complete-profile",
      priority: "low",
      icon: "check",
      title: id ? `Profil ${p.profileCompletion}% lengkap` : `Profile ${p.profileCompletion}% complete`,
      desc: id ? "Semakin lengkap, semakin tajam output setiap modul" : "The more complete, the sharper every module's output",
      cta: id ? "Lengkapi profil" : "Complete profile",
      href: "/profile",
    })
  }

  // 9. No English practice yet
  if (input.englishCount === 0 && input.docCount > 0) {
    out.push({
      id: "try-english",
      priority: "low",
      icon: "book",
      title: id ? "Coba latihan bahasa Inggris" : "Try English practice",
      desc: id ? "Reading, Structure, dan Listening bergaya TOEFL" : "Reading, Structure, and Listening in TOEFL style",
      cta: id ? "Mulai latihan" : "Start practice",
      href: "/english",
    })
  }

  // Sort by priority, return top 4
  const order = { high: 0, medium: 1, low: 2 }
  return out.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 4)
}
