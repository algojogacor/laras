"use client"

import type { SerializedProfile } from "@/lib/profile"
import { cn } from "@/lib/utils"

/**
 * CV Visual templates (Brief Section 6.2) — 4 distinct styles.
 * Each renders the same profile data with a different visual identity.
 * Used for live preview + print-to-PDF (print stylesheet hides app chrome).
 */

type TemplateProps = { profile: SerializedProfile }

const fmtDate = (d: string | null | undefined, present: string) => {
  if (!d) return ""
  if (d.toLowerCase() === "present") return present
  const m = d.match(/^(\d{4})-(\d{1,2})/)
  if (m) return `${m[2].padStart(2, "0")}/${m[1]}`
  return d
}

/* ── 1. Modern Minimal — clean, lots of whitespace, thin dividers ── */
export function ModernMinimal({ profile }: TemplateProps) {
  const links = profile.links as any
  return (
    <div className="mx-auto w-full max-w-[640px] bg-white p-10 text-neutral-800" style={{ fontFamily: "Helvetica, Arial, sans-serif" }}>
      <header className="border-b-2 border-neutral-800 pb-4">
        <h1 className="text-3xl font-light tracking-tight">{profile.fullName}</h1>
        <p className="mt-1 text-sm uppercase tracking-[0.2em] text-neutral-500">{profile.headline}</p>
        <p className="mt-2 text-xs text-neutral-500">
          {[profile.email, profile.phone, profile.location, links?.linkedin, links?.portfolio].filter(Boolean).join("  ·  ")}
        </p>
      </header>
      {profile.summary && (
        <section className="mt-4">
          <p className="text-xs leading-relaxed text-neutral-600">{profile.summary}</p>
        </section>
      )}
      <Section title="Experience" className="mt-6">
        {profile.experiences.map((e) => (
          <div key={e.id} className="mb-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">{e.title}</span>
              <span className="text-[10px] text-neutral-400">{fmtDate(e.startDate, "Present")} – {e.current ? "Present" : fmtDate(e.endDate, "Present")}</span>
            </div>
            <span className="text-xs text-neutral-500">{e.organization}</span>
            {(e.achievements || []).map((a, i) => (
              <p key={i} className="mt-0.5 text-[11px] leading-snug text-neutral-600">· {a}</p>
            ))}
          </div>
        ))}
      </Section>
      <Section title="Education" className="mt-4">
        {profile.educations.map((e, i) => (
          <div key={i} className="mb-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">{e.institution}</span>
              <span className="text-[10px] text-neutral-400">{fmtDate(e.startDate, "")} – {e.current ? "Present" : fmtDate(e.endDate, "")}</span>
            </div>
            <span className="text-xs text-neutral-500">{[e.degree, e.field].filter(Boolean).join(", ")}</span>
          </div>
        ))}
      </Section>
      {profile.skills.length > 0 && (
        <Section title="Skills" className="mt-4">
          <p className="text-xs text-neutral-600">{profile.skills.map((s) => s.name).join("  ·  ")}</p>
        </Section>
      )}
    </div>
  )
}

/* ── 2. Corporate — sidebar layout, structured, formal ── */
export function Corporate({ profile }: TemplateProps) {
  const links = profile.links as any
  return (
    <div className="mx-auto w-full max-w-[640px] bg-white text-neutral-800" style={{ fontFamily: "Georgia, serif" }}>
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-[38%] bg-neutral-800 p-5 text-neutral-200">
          <h1 className="text-xl font-bold leading-tight text-white">{profile.fullName}</h1>
          <p className="mt-1 text-[11px] text-neutral-400">{profile.headline}</p>
          <div className="mt-4 space-y-3">
            <ContactBlock label="Contact" items={[profile.email, profile.phone, profile.location].filter(Boolean)} />
            {links && <ContactBlock label="Links" items={[links.linkedin, links.portfolio].filter(Boolean)} />}
            {profile.skills.length > 0 && <ContactBlock label="Skills" items={profile.skills.map((s) => s.name)} />}
            {profile.certifications.length > 0 && <ContactBlock label="Certs" items={profile.certifications.map((c) => c.name)} />}
          </div>
        </aside>
        {/* Main */}
        <main className="flex-1 p-5">
          {profile.summary && (
            <section className="mb-4">
              <h2 className="mb-1 border-b border-neutral-300 text-xs font-bold uppercase tracking-wide text-neutral-500">Profile</h2>
              <p className="text-[11px] leading-relaxed">{profile.summary}</p>
            </section>
          )}
          <section className="mb-4">
            <h2 className="mb-2 border-b border-neutral-300 text-xs font-bold uppercase tracking-wide text-neutral-500">Experience</h2>
            {profile.experiences.map((e) => (
              <div key={e.id} className="mb-3">
                <p className="text-sm font-bold">{e.title}</p>
                <p className="text-[11px] italic text-neutral-500">{e.organization} · {fmtDate(e.startDate, "")}–{e.current ? "Present" : fmtDate(e.endDate, "")}</p>
                {(e.achievements || []).map((a, i) => <p key={i} className="text-[11px] leading-snug">• {a}</p>)}
              </div>
            ))}
          </section>
          <section>
            <h2 className="mb-2 border-b border-neutral-300 text-xs font-bold uppercase tracking-wide text-neutral-500">Education</h2>
            {profile.educations.map((e, i) => (
              <div key={i} className="mb-1.5">
                <p className="text-sm font-bold">{e.institution}</p>
                <p className="text-[11px] italic text-neutral-500">{[e.degree, e.field].filter(Boolean).join(", ")}</p>
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  )
}

/* ── 3. Creative — bold accent color, asymmetric, personality ── */
export function Creative({ profile }: TemplateProps) {
  const links = profile.links as any
  return (
    <div className="mx-auto w-full max-w-[640px] bg-white text-neutral-800" style={{ fontFamily: "Helvetica, Arial, sans-serif" }}>
      {/* Header band */}
      <header className="bg-accent px-8 py-6 text-white">
        <h1 className="text-4xl font-black tracking-tight">{profile.fullName}</h1>
        <p className="mt-1 text-sm font-light uppercase tracking-widest text-white/80">{profile.headline}</p>
      </header>
      <div className="p-8">
        <div className="flex flex-wrap gap-4 text-[10px] text-neutral-500">
          {profile.email && <span>✉ {profile.email}</span>}
          {profile.phone && <span>☎ {profile.phone}</span>}
          {profile.location && <span>◍ {profile.location}</span>}
          {links?.linkedin && <span>in {links.linkedin}</span>}
        </div>
        {profile.summary && (
          <p className="mt-4 border-l-4 border-accent pl-3 text-xs italic leading-relaxed text-neutral-600">{profile.summary}</p>
        )}
        <h2 className="mt-6 text-lg font-black uppercase tracking-wide text-accent">Experience</h2>
        {profile.experiences.map((e) => (
          <div key={e.id} className="mt-3 border-b border-neutral-100 pb-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold">{e.title}</span>
              <span className="text-[10px] font-medium text-accent">{fmtDate(e.startDate, "")} – {e.current ? "Now" : fmtDate(e.endDate, "")}</span>
            </div>
            <p className="text-[11px] text-neutral-500">{e.organization}</p>
            {(e.achievements || []).map((a, i) => <p key={i} className="mt-0.5 text-[11px] leading-snug text-neutral-600">▸ {a}</p>)}
          </div>
        ))}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-accent">Education</h2>
            {profile.educations.map((e, i) => (
              <div key={i} className="mt-1.5">
                <p className="text-xs font-bold">{e.institution}</p>
                <p className="text-[10px] text-neutral-500">{[e.degree, e.field].filter(Boolean).join(", ")}</p>
              </div>
            ))}
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-accent">Skills</h2>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {profile.skills.map((s) => (
                <span key={s.id} className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">{s.name}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── 4. Technical — mono font, grid-like, data-dense ── */
export function Technical({ profile }: TemplateProps) {
  const links = profile.links as any
  return (
    <div className="mx-auto w-full max-w-[640px] bg-white p-8 text-neutral-800" style={{ fontFamily: "Courier New, monospace" }}>
      <header className="border-b-2 border-dashed border-neutral-300 pb-3">
        <h1 className="text-2xl font-bold">{profile.fullName}</h1>
        <p className="text-xs text-neutral-500">{profile.headline}</p>
        <p className="mt-1 text-[10px] text-neutral-400">
          {[profile.email, profile.phone, profile.location, links?.linkedin, links?.portfolio].filter(Boolean).join(" | ")}
        </p>
      </header>
      <Block label="// SUMMARY">
        <p className="text-[11px] leading-relaxed text-neutral-600">{profile.summary}</p>
      </Block>
      <Block label="// EXPERIENCE">
        {profile.experiences.map((e) => (
          <div key={e.id} className="mb-2.5">
            <p className="text-xs font-bold">{e.title} <span className="font-normal text-neutral-400">@ {e.organization}</span></p>
            <p className="text-[10px] text-neutral-400">[{fmtDate(e.startDate, "")} → {e.current ? "now" : fmtDate(e.endDate, "")}]</p>
            {(e.achievements || []).map((a, i) => <p key={i} className="text-[11px] leading-snug text-neutral-600">  &gt; {a}</p>)}
          </div>
        ))}
      </Block>
      <Block label="// EDUCATION">
        {profile.educations.map((e, i) => (
          <div key={i} className="mb-1">
            <p className="text-xs font-bold">{e.institution}</p>
            <p className="text-[10px] text-neutral-400">{[e.degree, e.field, e.gpa && `GPA:${e.gpa}`].filter(Boolean).join(" | ")}</p>
          </div>
        ))}
      </Block>
      {profile.skills.length > 0 && (
        <Block label="// SKILLS">
          <p className="text-[11px] text-neutral-600">{profile.skills.map((s) => `${s.name}${s.proficiency ? `(${s.proficiency[0].toUpperCase()})` : ""}`).join("  ")}</p>
        </Block>
      )}
    </div>
  )
}

/* ── shared bits ── */
function Section({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={className}>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">{title}</h2>
      {children}
    </section>
  )
}
function ContactBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">{label}</h3>
      <ul className="space-y-0.5">
        {items.map((it, i) => <li key={i} className="text-[10px] leading-snug text-neutral-300">{it}</li>)}
      </ul>
    </div>
  )
}
function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h2 className="mb-1.5 text-xs font-bold text-neutral-500">{label}</h2>
      {children}
    </section>
  )
}

export const TEMPLATES = [
  { id: "modern-minimal", name: "Modern Minimal", Component: ModernMinimal, desc: "Clean · light · airy" },
  { id: "corporate", name: "Corporate", Component: Corporate, desc: "Sidebar · formal · structured" },
  { id: "creative", name: "Creative", Component: Creative, desc: "Bold accent · personality" },
  { id: "technical", name: "Technical", Component: Technical, desc: "Mono · data-dense · grid" },
] as const
