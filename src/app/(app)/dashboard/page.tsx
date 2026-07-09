import Link from "next/link"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { computeCompletion, type ProfileWithRelations } from "@/lib/profile"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  FileText,
  ClipboardList,
  MessageSquareText,
  Headphones,
  PenLine,
  ArrowRight,
  Sparkles,
  Clock,
} from "lucide-react"

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const profile = (await db.userProfile.findUnique({
    where: { accountId: session.userId },
    include: {
      experiences: { orderBy: { order: "asc" } },
      educations: { orderBy: { order: "asc" } },
      skills: { orderBy: { order: "asc" } },
      certifications: { orderBy: { order: "asc" } },
      languages: { orderBy: { order: "asc" } },
    },
  })) as ProfileWithRelations | null

  if (!profile) redirect("/onboarding")
  if (!profile.onboardingComplete) redirect("/onboarding")

  const { t } = await getLocaleAndDict()
  const completion = computeCompletion(profile)

  const greetingName = profile.fullName?.split(" ")[0] ?? session.email.split("@")[0]

  const verticals = [
    {
      title: t.landing.v1Title,
      desc: t.landing.v1Desc,
      Icon: FileText,
      cta: t.dashboard.v1Cta,
      href: "/documents",
      active: true,
    },
    {
      title: t.landing.v2Title,
      desc: t.landing.v2Desc,
      Icon: ClipboardList,
      cta: t.dashboard.v2Cta,
      href: "/applications",
      active: true,
    },
    {
      title: t.landing.v3Title,
      desc: t.landing.v3Desc,
      Icon: MessageSquareText,
      cta: t.dashboard.v3Cta,
      href: "/interview",
      active: true,
    },
    {
      title: t.landing.v4Title,
      desc: t.landing.v4Desc,
      Icon: Headphones,
      cta: t.dashboard.v4Cta,
      href: "/english",
      active: true,
    },
    {
      title: t.landing.v5Title,
      desc: t.landing.v5Desc,
      Icon: PenLine,
      cta: t.dashboard.v5Cta,
      href: "/documents/essay/new",
      active: true,
    },
  ]

  const recentApps = await db.application.findMany({
    where: { userProfileId: profile.id },
    orderBy: { updatedAt: "desc" },
    take: 4,
  })

  // Cross-vertical stats
  const [docCount, appCount, interviewCount, englishCount] = await Promise.all([
    db.document.count({ where: { userProfileId: profile.id } }),
    db.application.count({ where: { userProfileId: profile.id } }),
    db.interviewSet.count({ where: { userProfileId: profile.id } }),
    db.englishSession.count({ where: { userProfileId: profile.id, score: { not: null } } }),
  ])

  // Recent documents
  const recentDocs = await db.document.findMany({
    where: { userProfileId: profile.id },
    orderBy: { updatedAt: "desc" },
    take: 3,
    select: { id: true, type: true, title: true, updatedAt: true },
  })

  // Recent interview sessions
  const recentInterviews = await db.interviewSet.findMany({
    where: { userProfileId: profile.id },
    orderBy: { updatedAt: "desc" },
    take: 3,
    select: { id: true, title: true, role: true, updatedAt: true },
  })

  return (
    <div className="space-y-8 animate-rise">
      {/* Greeting */}
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.dashboard.greeting}, {greetingName}.
        </h1>
        <p className="mt-1.5 text-muted-foreground">{t.dashboard.welcomeBack}</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t.documents.title} value={docCount} href="/documents" Icon={FileText} />
        <StatCard label={t.applications.title} value={appCount} href="/applications" Icon={ClipboardList} />
        <StatCard label={t.interview.title} value={interviewCount} href="/interview" Icon={MessageSquareText} />
        <StatCard label={t.english.title} value={englishCount} href="/english" Icon={Headphones} />
      </div>

      {/* Completion + quick action */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-medium text-muted-foreground">
                {t.dashboard.completionTitle}
              </CardTitle>
              <CardDescription className="mt-1">{t.dashboard.completionDesc}</CardDescription>
            </div>
            <div className="text-right">
              <div className="font-serif text-4xl font-semibold text-primary">{completion}%</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={completion} className="h-2.5" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {profile.experiences.length} {t.profile.experience.toLowerCase()} ·{" "}
                {profile.skills.length} {t.profile.skills.toLowerCase()} ·{" "}
                {profile.educations.length} {t.profile.education.toLowerCase()}
              </span>
              {completion < 100 && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/profile">
                    {t.dashboard.completeProfile}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft bg-primary text-primary-foreground">
          <CardContent className="flex h-full flex-col justify-between p-6">
            <Sparkles className="h-6 w-6 text-primary-foreground/80" />
            <div className="mt-6">
              <p className="font-serif text-lg font-medium leading-snug">
                {t.brand.tagline}
              </p>
              <Button
                asChild
                variant="secondary"
                size="sm"
                className="mt-4 bg-background text-foreground hover:bg-background/90"
              >
                <Link href="/documents/cv-ats/new">{t.dashboard.v1Cta}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verticals */}
      <section>
        <h2 className="font-serif text-xl font-semibold">{t.dashboard.verticalsTitle}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {verticals.map((v) => {
            const Icon = v.Icon
            return (
              <Card
                key={v.title}
                className="group relative overflow-hidden shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    {!v.active && (
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t.dashboard.comingSoon}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 font-serif text-lg font-semibold">{v.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                    {v.desc}
                  </p>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="mt-4 -ml-2 text-primary hover:bg-primary/5"
                  >
                    <Link href={v.href}>
                      {v.cta}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Recent activity — cross-vertical */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Recent applications */}
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              {t.applications.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentApps.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.dashboard.noActivity}</p>
            ) : (
              <ul className="space-y-2">
                {recentApps.map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.position}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.organization}</p>
                    </div>
                    <span className="ml-2 shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize text-muted-foreground">{a.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent documents */}
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {t.documents.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentDocs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.dashboard.noActivity}</p>
            ) : (
              <ul className="space-y-2">
                {recentDocs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-muted-foreground">{t.documents.types[d.type as keyof typeof t.documents.types] ?? d.type}</p>
                    </div>
                    <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">{new Date(d.updatedAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function StatCard({ label, value, href, Icon }: { label: string; value: number; href: string; Icon: typeof FileText }) {
  return (
    <Link href={href} className="group">
      <Card className="shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-serif text-2xl font-semibold leading-none">{value}</p>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
