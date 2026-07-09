"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  FileText,
  ClipboardList,
  MessageSquareText,
  Headphones,
  PenLine,
  ShieldCheck,
  Layers,
  Sparkles,
  Globe2,
  ArrowRight,
} from "lucide-react"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { Button } from "@/components/ui/button"
import { useT } from "@/components/providers/locale-provider"

const verticalIcons = [FileText, ClipboardList, MessageSquareText, Headphones, PenLine]

export default function Home() {
  const t = useT()

  const verticals = [
    { title: t.landing.v1Title, desc: t.landing.v1Desc, Icon: FileText },
    { title: t.landing.v2Title, desc: t.landing.v2Desc, Icon: ClipboardList },
    { title: t.landing.v3Title, desc: t.landing.v3Desc, Icon: MessageSquareText },
    { title: t.landing.v4Title, desc: t.landing.v4Desc, Icon: Headphones },
    { title: t.landing.v5Title, desc: t.landing.v5Desc, Icon: PenLine },
  ]

  const principles = [
    { Icon: ShieldCheck, title: t.landing.principle1Title, desc: t.landing.principle1Desc },
    { Icon: Layers, title: t.landing.principle2Title, desc: t.landing.principle2Desc },
    { Icon: Sparkles, title: t.landing.principle3Title, desc: t.landing.principle3Desc },
    { Icon: Globe2, title: t.landing.principle4Title, desc: t.landing.principle4Desc },
  ]

  const stats = [
    { value: "1", label: t.landing.statsProfiles },
    { value: "5", label: t.landing.statsVerticals },
    { value: "2", label: t.landing.statsLang },
  ]

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* ───────────── Hero ───────────── */}
        <section className="relative overflow-hidden">
          {/* soft radial accents */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
          />

          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {t.landing.badge}
              </span>
              <h1 className="mt-6 font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
                {t.landing.heroTitle}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
                {t.landing.heroSubtitle}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="shadow-lift">
                  <Link href="/signup">
                    {t.landing.heroCta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="#verticals">{t.landing.heroCtaSecondary}</Link>
                </Button>
              </div>
            </motion.div>

            {/* Constellation visual: one profile, five verticals */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="relative mx-auto h-[340px] w-full max-w-md sm:h-[400px]"
            >
              <Constellation />
            </motion.div>
          </div>

          {/* stats strip */}
          <div className="border-y border-border/60 bg-card/40">
            <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-border/60 px-4 sm:px-6">
              {stats.map((s) => (
                <div key={s.label} className="px-2 py-6 text-center sm:px-6">
                  <div className="font-serif text-3xl font-semibold text-primary sm:text-4xl">
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── Verticals ───────────── */}
        <section id="verticals" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="max-w-2xl">
              <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                {t.landing.verticalsTitle}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground text-pretty">
                {t.landing.verticalsSubtitle}
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {verticals.map((v, i) => {
                const Icon = v.Icon
                return (
                  <motion.div
                    key={v.title}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: i * 0.06 }}
                    className={[
                      "group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift",
                      i === 0 ? "lg:row-span-2 lg:flex lg:flex-col lg:justify-between" : "",
                    ].join(" ")}
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                      style={{ background: "var(--accent)" }}
                    />
                    <div className="relative">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 font-serif text-xl font-semibold">{v.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                        {v.desc}
                      </p>
                    </div>
                    {i === 0 && (
                      <div className="relative mt-6 hidden lg:block">
                        <div className="flex flex-wrap gap-1.5">
                          {["CV ATS", "CV Visual", "Cover Letter", "Personal Deck", "Bio"].map(
                            (chip) => (
                              <span
                                key={chip}
                                className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground"
                              >
                                {chip}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ───────────── Principles ───────────── */}
        <section id="principles" className="scroll-mt-20 bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              {t.landing.principlesTitle}
            </h2>
            <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
              {principles.map((p, i) => {
                const Icon = p.Icon
                return (
                  <motion.div
                    key={p.title}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: i * 0.06 }}
                    className="flex gap-5"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-semibold">{p.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                        {p.desc}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ───────────── CTA ───────────── */}
        <section>
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-primary px-6 py-14 text-center shadow-lift sm:px-12">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{
                  background:
                    "radial-gradient(circle at 20% 20%, var(--accent) 0%, transparent 50%), radial-gradient(circle at 80% 80%, var(--accent) 0%, transparent 50%)",
                }}
              />
              <div className="relative">
                <h2 className="font-serif text-3xl font-semibold text-primary-foreground sm:text-4xl">
                  {t.landing.ctaTitle}
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80 text-pretty">
                  {t.landing.ctaDesc}
                </p>
                <div className="mt-8 flex justify-center">
                  <Button
                    asChild
                    size="lg"
                    variant="secondary"
                    className="bg-background text-foreground hover:bg-background/90"
                  >
                    <Link href="/signup">
                      {t.nav.signup}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}

/* Constellation: a central profile node with 5 verticals orbiting, connected by lines. */
function Constellation() {
  const t = useT()
  const nodes = [
    { label: t.landing.v1Title, Icon: FileText, pos: "top-[8%] left-[50%] -translate-x-1/2" },
    { label: t.landing.v2Title, Icon: ClipboardList, pos: "top-[34%] right-[2%]" },
    { label: t.landing.v3Title, Icon: MessageSquareText, pos: "bottom-[8%] right-[14%]" },
    { label: t.landing.v4Title, Icon: Headphones, pos: "bottom-[8%] left-[14%]" },
    { label: t.landing.v5Title, Icon: PenLine, pos: "top-[34%] left-[2%]" },
  ]
  // center approx 50%,50%
  const center = { x: 50, y: 50 }
  const coords = [
    { x: 50, y: 12 },
    { x: 90, y: 38 },
    { x: 80, y: 88 },
    { x: 20, y: 88 },
    { x: 10, y: 38 },
  ]

  return (
    <div className="relative h-full w-full">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {coords.map((c, i) => (
          <motion.line
            key={i}
            x1={center.x}
            y1={center.y}
            x2={c.x}
            y2={c.y}
            stroke="var(--border)"
            strokeWidth="0.4"
            strokeDasharray="1.2 1.2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
          />
        ))}
      </svg>

      {/* center profile node */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-border bg-card shadow-lift">
          <div
            className="absolute inset-0 rounded-full opacity-20 blur-md"
            style={{ background: "var(--primary)" }}
          />
          <div className="relative text-center">
            <div className="font-serif text-2xl font-semibold text-primary">1</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              profile
            </div>
          </div>
        </div>
      </motion.div>

      {/* orbiting vertical nodes */}
      {nodes.map((n, i) => {
        const Icon = n.Icon
        return (
          <motion.div
            key={n.label}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.35 + i * 0.1 }}
            className={`absolute ${n.pos}`}
          >
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-primary shadow-soft">
                <Icon className="h-5 w-5" />
              </div>
              <span className="max-w-[72px] text-center text-[10px] font-medium leading-tight text-muted-foreground">
                {n.label}
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
