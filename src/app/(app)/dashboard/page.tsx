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

  return (
    <div className="space-y-8 animate-rise">
      {/* Greeting */}
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.dashboard.greeting}, {greetingName}.
        </h1>
        <p className="mt-1.5 text-muted-foreground">{t.dashboard.welcomeBack}</p>
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
                <Link href="/profile">{t.dashboard.completeProfile}</Link>
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

      {/* Recent activity */}
      <section>
        <h2 className="font-serif text-xl font-semibold">{t.dashboard.recentTitle}</h2>
        <Card className="mt-4 shadow-soft">
          <CardContent className="p-6">
            {recentApps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{t.dashboard.noActivity}</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recentApps.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{a.position}</p>
                      <p className="text-xs text-muted-foreground">{a.organization}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs capitalize text-muted-foreground">
                      {a.status}
                    </span>
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
