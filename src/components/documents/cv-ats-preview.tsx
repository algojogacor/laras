"use client"

import type { GeneratedCVATS } from "@/lib/content-engine"
import type { SerializedProfile } from "@/lib/profile"
import { useT } from "@/components/providers/locale-provider"
import { cn } from "@/lib/utils"

/**
 * ATS preview renderer — mirrors the DOCX output exactly (Brief Section 7).
 * One column, standard section order, bullet-only, no icons/charts.
 * Uses a serif/sans "paper" look so users see what the real document feels like.
 */
export function CVATSPreview({
  profile,
  cv,
  locale,
}: {
  profile: SerializedProfile
  cv: GeneratedCVATS
  locale: "id" | "en"
}) {
  const t = useT()
  const isID = locale === "id"
  const present = t.documents.present
  const links = profile.links as { linkedin?: string; portfolio?: string; github?: string; website?: string } | undefined

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return ""
    if (d.toLowerCase() === "present") return present
    const m = d.match(/^(\d{4})-(\d{1,2})/)
    if (m) return `${m[2].padStart(2, "0")}/${m[1]}`
    return d
  }

  const contactParts = [profile.email, profile.phone, profile.location].filter(Boolean)
  if (links?.linkedin) contactParts.push(links.linkedin)
  if (links?.portfolio) contactParts.push(links.portfolio)

  const skillGroups = cv.skillsByCategory.length
    ? cv.skillsByCategory
    : profile.skills.length
      ? [{ category: t.documents.sectionSkills, items: profile.skills.map((s) => s.name) }]
      : []

  return (
    <div
      className="mx-auto w-full max-w-[640px] bg-white px-12 py-10 text-[11px] leading-relaxed text-neutral-900 shadow-lift"
      style={{ fontFamily: "Calibri, Arial, Helvetica, sans-serif", minHeight: "297mm" }}
    >
      {/* Name */}
      <h1 className="text-[20px] font-bold tracking-tight">{profile.fullName || ""}</h1>
      {/* Headline */}
      {cv.headline && <p className="mt-0.5 text-[10px] italic text-neutral-600">{cv.headline}</p>}
      {/* Contact */}
      {contactParts.length > 0 && (
        <p className="mt-1 text-[10px] text-neutral-700">{contactParts.join("  |  ")}</p>
      )}

      {/* Summary */}
      {cv.summary && (
        <Section title={t.documents.sectionSummary}>
          <p>{cv.summary}</p>
        </Section>
      )}

      {/* Skills */}
      {skillGroups.length > 0 && (
        <Section title={t.documents.sectionSkills}>
          {skillGroups.map((g, i) => (
            <p key={i} className="mb-0.5">
              <span className="font-semibold">{g.category}: </span>
              {g.items.join(", ")}
            </p>
          ))}
        </Section>
      )}

      {/* Experience */}
      {profile.experiences.length > 0 && (
        <Section title={t.documents.sectionExperience}>
          {profile.experiences.map((exp, idx) => {
            const gen = cv.experiences.find((e) => e.experienceId === exp.id) || cv.experiences[idx]
            const dateStr = [fmtDate(exp.startDate), fmtDate(exp.current ? "Present" : exp.endDate)]
              .filter(Boolean)
              .join(" – ")
            return (
              <div key={exp.id} className="mb-2.5">
                <p className="font-bold">
                  {exp.title}
                  {exp.organization ? ` — ${exp.organization}` : ""}
                </p>
                {dateStr && <p className="text-[10px] italic text-neutral-600">{dateStr}</p>}
                {gen?.bullets.map((b, i) => (
                  <p key={i} className="flex gap-1.5">
                    <span className="select-none">•</span>
                    <span>{b.text}</span>
                  </p>
                ))}
              </div>
            )
          })}
        </Section>
      )}

      {/* Education */}
      {profile.educations.length > 0 && (
        <Section title={t.documents.sectionEducation}>
          {profile.educations.map((edu, i) => {
            const detail = [edu.field, edu.gpa && `GPA: ${edu.gpa}`].filter(Boolean).join(" · ")
            const dateStr = [fmtDate(edu.startDate), fmtDate(edu.current ? "Present" : edu.endDate)]
              .filter(Boolean)
              .join(" – ")
            return (
              <div key={i} className="mb-1.5">
                <p className="font-bold">
                  {edu.institution}
                  {edu.degree ? ` — ${edu.degree}` : ""}
                </p>
                {(detail || dateStr) && (
                  <p className="text-[10px] italic text-neutral-600">
                    {[detail, dateStr].filter(Boolean).join("  |  ")}
                  </p>
                )}
              </div>
            )
          })}
        </Section>
      )}

      {/* Certifications */}
      {profile.certifications.length > 0 && (
        <Section title={t.documents.sectionCertifications}>
          {profile.certifications.map((c, i) => (
            <p key={i} className="mb-0.5">
              <span className="font-bold">{c.name}</span>
              {c.issuer ? ` — ${c.issuer}` : ""}
              {c.issueDate ? ` (${fmtDate(c.issueDate)})` : ""}
            </p>
          ))}
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h2 className="mb-1.5 border-b border-neutral-300 text-[13px] font-bold uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </section>
  )
}
