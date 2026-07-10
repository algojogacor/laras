import Link from "next/link"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { computeCompletion, type ProfileWithRelations } from "@/lib/profile"
import {
  computeProfileBreakdown,
  computeReadinessScore,
  buildActivityTimeline,
  type DimensionKey,
} from "@/lib/readiness"
import { computeVerificationSummary, type VerificationType } from "@/lib/verification"
import { getEntitlement } from "@/lib/entitlement"
import { generateSuggestions } from "@/lib/suggestions"
import { SmartSuggestions } from "@/components/dashboard/smart-suggestions"
import { ReadinessRing } from "@/components/dashboard/readiness-ring"
import { CompletenessBreakdown } from "@/components/dashboard/completeness-breakdown"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { ActivityTimeline } from "@/components/dashboard/activity-timeline"
import { VerificationPanel } from "@/components/dashboard/verification-panel"
import { AnnouncementFeed } from "@/components/dashboard/announcement-feed"
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
  TrendingUp,
  Activity as ActivityIcon,
  ShieldCheck,
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

  const { t, locale } = await getLocaleAndDict()
  const completion = computeCompletion(profile)
  const breakdown = computeProfileBreakdown(profile)

  const greetingName = profile.fullName?.split(" ")[0] ?? session.email.split("@")[0]

  // Cross-vertical stats
  const [docCount, appCount, interviewCount, englishCount] = await Promise.all([
    db.document.count({ where: { userProfileId: profile.id } }),
    db.application.count({ where: { userProfileId: profile.id } }),
    db.interviewSet.count({ where: { userProfileId: profile.id } }),
    db.englishSession.count({ where: { userProfileId: profile.id, score: { not: null } } }),
  ])

  // Composite readiness score
  const readiness = computeReadinessScore({
    completion,
    docCount,
    appCount,
    interviewCount,
    englishCount,
  })

  // Trust & Verification summary (Brief §9.1 — Trust and Verification Graph)
  const verification = await computeVerificationSummary(profile)
  const claimLabelMap: Record<VerificationType, string> = {
    email: t.dashboard.claimEmail,
    phone: t.dashboard.claimPhone,
    identity: t.dashboard.claimIdentity,
    education: t.dashboard.claimEducation,
    employment: t.dashboard.claimEmployment,
    skill: t.dashboard.claimSkill,
  }
  const verificationClaims = verification.claims.map((c) => ({
    ...c,
    label: claimLabelMap[c.type],
  }))

  // Announcements feed (Brief §9.4/§9.5 — targeted to user's plan + admin)
  const entitlement = await getEntitlement(profile)
  const audiences = ["all"]
  if (entitlement.plan === "free") audiences.push("free")
  else audiences.push("pro")
  if (session.role === "admin" || session.role === "owner") audiences.push("admin")
  const now = new Date()
  const announcements = await db.announcement.findMany({
    where: {
      status: "published",
      publishedAt: { lte: now },
      audience: { in: audiences },
    },
    orderBy: [{ priority: "desc" }, { publishedAt: "desc" }],
    take: 5,
    select: { id: true, title: true, body: true, audience: true, priority: true, publishedAt: true },
  })

  const levelLabelMap: Record<string, string> = {
    starter: t.dashboard.levelStarter,
    building: t.dashboard.levelBuilding,
    ready: t.dashboard.levelReady,
    competitive: t.dashboard.levelCompetitive,
  }
  const levelDescMap: Record<string, string> = {
    starter: t.dashboard.levelStarterDesc,
    building: t.dashboard.levelBuildingDesc,
    ready: t.dashboard.levelReadyDesc,
    competitive: t.dashboard.levelCompetitiveDesc,
  }
  const levelLabel = levelLabelMap[readiness.level]
  const levelDesc = levelDescMap[readiness.level]

  const dimensionLabels: Record<DimensionKey, string> = {
    basics: t.dashboard.dimBasics,
    experience: t.dashboard.dimExperience,
    skills: t.dashboard.dimSkills,
    education: t.dashboard.dimEducation,
    languages: t.dashboard.dimLanguages,
    preferences: t.dashboard.dimPreferences,
  }
  const dimensionHints: Record<DimensionKey, string> = {
    basics: t.dashboard.hintBasics,
    experience: t.dashboard.hintExperience,
    skills: t.dashboard.hintSkills,
    education: t.dashboard.hintEducation,
    languages: t.dashboard.hintLanguages,
    preferences: t.dashboard.hintPreferences,
  }

  const verticals = [
    { title: t.landing.v1Title, desc: t.landing.v1Desc, Icon: FileText, cta: t.dashboard.v1Cta, href: "/documents" },
    { title: t.landing.v2Title, desc: t.landing.v2Desc, Icon: ClipboardList, cta: t.dashboard.v2Cta, href: "/applications" },
    { title: t.landing.v3Title, desc: t.landing.v3Desc, Icon: MessageSquareText, cta: t.dashboard.v3Cta, href: "/interview" },
    { title: t.landing.v4Title, desc: t.landing.v4Desc, Icon: Headphones, cta: t.dashboard.v4Cta, href: "/english" },
    { title: t.landing.v5Title, desc: t.landing.v5Desc, Icon: PenLine, cta: t.dashboard.v5Cta, href: "/documents/essay/new" },
  ]

  const quickActions = [
    { key: "cv", title: t.dashboard.qaCvTitle, desc: t.dashboard.qaCvDesc, href: "/documents/cv-ats/new", accent: "bg-chart-1/5" },
    { key: "app", title: t.dashboard.qaAppTitle, desc: t.dashboard.qaAppDesc, href: "/applications", accent: "bg-chart-2/5" },
    { key: "interview", title: t.dashboard.qaInterviewTitle, desc: t.dashboard.qaInterviewDesc, href: "/interview", accent: "bg-chart-4/5" },
    { key: "english", title: t.dashboard.qaEnglishTitle, desc: t.dashboard.qaEnglishDesc, href: "/english", accent: "bg-chart-3/5" },
  ]

  // Recent data for timeline
  const [recentDocs, recentApps, recentInterviews, recentEnglish] = await Promise.all([
    db.document.findMany({
      where: { userProfileId: profile.id },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: { id: true, type: true, title: true, updatedAt: true },
    }),
    db.application.findMany({
      where: { userProfileId: profile.id },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: { id: true, position: true, organization: true, status: true, updatedAt: true },
    }),
    db.interviewSet.findMany({
      where: { userProfileId: profile.id },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: { id: true, title: true, role: true, updatedAt: true },
    }),
    db.englishSession.findMany({
      where: { userProfileId: profile.id, score: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, createdAt: true, score: true },
    }),
  ])

  const typeLabels: Record<string, string> = t.documents.types as Record<string, string>
  const timeline = buildActivityTimeline({
    documents: recentDocs,
    applications: recentApps,
    interviews: recentInterviews,
    english: recentEnglish,
    typeLabels,
  })

  // All applications for deadline-based suggestions
  const allApps = await db.application.findMany({
    where: { userProfileId: profile.id },
    select: { id: true, position: true, organization: true, status: true, deadline: true },
  })

  const suggestions = generateSuggestions({
    profile: {
      fullName: profile.fullName, headline: profile.headline, summary: profile.summary,
      email: profile.email, phone: profile.phone, location: profile.location,
      preferredTone: profile.preferredTone, urgency: profile.urgency,
      opportunityTypes: profile.opportunityTypes, targetExamScore: profile.targetExamScore,
      profileCompletion: completion,
    },
    experiences: profile.experiences,
    skillsCount: profile.skills.length,
    docCount, appCount, interviewCount, englishCount,
    applications: allApps,
  }, locale)

  return (
    <div className="space-y-8 animate-rise">
      {/* Greeting */}
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.dashboard.greeting}, {greetingName}.
        </h1>
        <p className="mt-1.5 text-muted-foreground">{t.dashboard.welcomeBack}</p>
      </div>

      {/* --- Announcements feed --- */}
      <AnnouncementFeed
        initialAnnouncements={announcements.map((a) => ({
          ...a,
          priority: a.priority as "low" | "normal" | "high" | "urgent",
          publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
        }))}
        labels={{
          feedTitle: t.announcements.feedTitle,
          feedEmpty: t.announcements.feedEmpty,
        }}
      />

      {/* --- Career Readiness Hero --- */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Readiness ring + level */}
        <Card className="lg:col-span-1 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-primary" />
              {t.dashboard.readinessTitle}
            </CardTitle>
            <CardDescription className="text-xs">{t.dashboard.readinessDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-2">
            <ReadinessRing
              score={readiness.score}
              level={levelLabel}
              levelDescription={levelDesc}
              size={168}
            />
            <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
              {levelDesc}
            </p>
            {/* Compact component breakdown */}
            <div className="mt-4 grid w-full grid-cols-5 gap-1.5">
              {readiness.components.map((c) => (
                <div key={c.key} className="text-center">
                  <div className="mx-auto h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${c.value}%` }}
                    />
                  </div>
                  <span className="mt-1 block text-[9px] font-medium tabular-nums text-muted-foreground">
                    {c.value}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Profile breakdown */}
        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.dashboard.breakdownTitle}
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs">{t.dashboard.breakdownDesc}</CardDescription>
              </div>
              <div className="text-right">
                <div className="font-serif text-xl font-semibold text-foreground tabular-nums sm:text-2xl">
                  {breakdown.overall}<span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{t.dashboard.completionTitle}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CompletenessBreakdown
              dimensions={breakdown.dimensions}
              labels={dimensionLabels}
              hints={dimensionHints}
              completeLabel={t.dashboard.dimComplete}
            />
            {breakdown.overall < 100 && (
              <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                <Link href="/profile">
                  {t.dashboard.completeProfile}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- Trust & Verification (Brief §9.1) --- */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-serif text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {t.dashboard.verificationTitle}
          </CardTitle>
          <CardDescription className="text-xs">{t.dashboard.verificationDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <VerificationPanel
            claims={verificationClaims}
            verifiedCount={verification.verifiedCount}
            totalCount={verification.totalCount}
            trustScore={verification.trustScore}
            labels={{
              title: t.dashboard.verificationTitle,
              desc: t.dashboard.verificationDesc,
              verified: t.dashboard.statusVerified,
              pending: t.dashboard.statusPending,
              rejected: t.dashboard.statusRejected,
              expired: t.dashboard.statusExpired,
              trustScore: t.dashboard.trustScore,
              of: t.dashboard.of,
            }}
          />
        </CardContent>
      </Card>

      {/* --- Stats strip --- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t.documents.title} value={docCount} href="/documents" Icon={FileText} />
        <StatCard label={t.applications.title} value={appCount} href="/applications" Icon={ClipboardList} />
        <StatCard label={t.interview.title} value={interviewCount} href="/interview" Icon={MessageSquareText} />
        <StatCard label={t.english.title} value={englishCount} href="/english" Icon={Headphones} />
      </div>

      {/* --- Quick Actions --- */}
      <section>
        <h2 className="font-serif text-xl font-semibold">{t.dashboard.quickActionsTitle}</h2>
        <div className="mt-4">
          <QuickActions actions={quickActions} />
        </div>
      </section>

      {/* --- Smart Suggestions --- */}
      <SmartSuggestions suggestions={suggestions} />

      {/* --- Activity Timeline + Tagline --- */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-serif text-base">
              <ActivityIcon className="h-4 w-4 text-primary" />
              {t.dashboard.timelineTitle}
            </CardTitle>
            <CardDescription className="text-xs">{t.dashboard.timelineDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityTimeline
              items={timeline}
              emptyMessage={t.dashboard.timelineEmpty}
              timeAgoLabels={{
                now: t.dashboard.timeNow,
                minutes: t.dashboard.timeMinutes,
                hours: t.dashboard.timeHours,
                days: t.dashboard.timeDays,
              }}
            />
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
      </section>

      {/* --- Verticals --- */}
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
            <p className="font-serif text-2xl font-semibold leading-none tabular-nums">{value}</p>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
