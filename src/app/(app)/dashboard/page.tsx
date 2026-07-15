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
import { getRecentActivity, type ActivityEventItem } from "@/lib/activity"
import { SmartSuggestions } from "@/components/dashboard/smart-suggestions"
import { ReadinessRing } from "@/components/dashboard/readiness-ring"
import { CompletenessBreakdown } from "@/components/dashboard/completeness-breakdown"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { ActivityTimeline } from "@/components/dashboard/activity-timeline"
import { VerificationPanel } from "@/components/dashboard/verification-panel"
import { AnnouncementFeed } from "@/components/dashboard/announcement-feed"
import { ActionCenter, type ActionItem } from "@/components/dashboard/action-center"
import { QuickStats } from "@/components/dashboard/quick-stats"
import { DeadlineAlerts, type DeadlineAlert } from "@/components/dashboard/deadline-alerts"
import { NetworkActivity, type NetworkEvent } from "@/components/dashboard/network-activity"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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

  // ── Parallel data fetch: core counts + evidence + activity + network ──
  const [docCount, appCount, connectionCount, opportunityCount, interviewCount, englishCount, evidenceItems, activityEvents, pendingConnections, unreadNotifications, recentConnectionEvents] = await Promise.all([
    db.document.count({ where: { userProfileId: profile.id } }),
    db.application.count({ where: { userProfileId: profile.id } }),
    db.connection.count({ where: { addresseeId: profile.id, status: "accepted" } }),
    db.opportunity.count({ where: { userProfileId: profile.id } }),
    db.interviewSet.count({ where: { userProfileId: profile.id } }),
    db.englishSession.count({ where: { userProfileId: profile.id, score: { not: null } } }),
    db.evidence.findMany({
      where: { userProfileId: profile.id },
      select: { id: true, type: true, title: true, verificationStatus: true, metricValue: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getRecentActivity(profile.id, 20),
    db.connection.findMany({
      where: { addresseeId: profile.id, status: "pending" },
      take: 5,
      select: { id: true, requester: { select: { fullName: true, headline: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.notification.count({ where: { userProfileId: profile.id, readAt: null } }),
    db.connection.findMany({
      where: {
        OR: [
          { requesterId: profile.id, status: "accepted" },
          { addresseeId: profile.id, status: "accepted" },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        requesterId: true,
        addresseeId: true,
        updatedAt: true,
        requester: { select: { fullName: true, headline: true } },
        addressee: { select: { fullName: true, headline: true } },
      },
    }),
  ])

  // ── Evidence-weighted Readiness ──────────────────────────────────────
  // Evidence quality boosts the readiness score:
  //   - self-reported evidence: modest lift
  //   - pending verification: medium lift
  //   - verified evidence: strong lift
  const verifiedEvidence = evidenceItems.filter((e) => e.verificationStatus === "verified").length
  const pendingEvidence = evidenceItems.filter((e) => e.verificationStatus === "pending").length
  const selfReportedEvidence = evidenceItems.filter((e) => e.verificationStatus === "self-reported").length
  const hasMetrics = evidenceItems.filter((e) => e.metricValue != null).length

  // Boost completion by evidence quality (up to +15 percentage points)
  const evidenceBoost = Math.min(15,
    verifiedEvidence * 5 +
    pendingEvidence * 2 +
    selfReportedEvidence * 1 +
    hasMetrics * 3
  )
  const adjustedCompletion = Math.min(100, completion + evidenceBoost)

  const readiness = computeReadinessScore({
    completion: adjustedCompletion,
    docCount,
    appCount,
    interviewCount,
    englishCount,
  })

  // ── Trust & Verification summary ────────────────────────────────────
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

  // ── Announcements feed ──────────────────────────────────────────────
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

  // ── Level labels ────────────────────────────────────────────────────
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

  // ── Quick stats ─────────────────────────────────────────────────────
  const connectionsLabel = locale === "id" ? "Koneksi" : "Connections"
  const oppsLabel = locale === "id" ? "Kesempatan" : "Opportunities"

  const quickStats = [
    { key: "documents", label: t.documents.title, value: docCount, href: "/documents" },
    { key: "applications", label: t.applications.title, value: appCount, href: "/applications" },
    { key: "connections", label: connectionsLabel, value: connectionCount, href: "/connections" },
    { key: "opportunities", label: oppsLabel, value: opportunityCount, href: "/opportunities" },
  ]

  // ── Action center ────────────────────────────────────────────────────
  const actionItems: ActionItem[] = []

  // Pending connection requests
  for (const pc of pendingConnections) {
    actionItems.push({
      id: `conn-req-${pc.id}`,
      priority: "high",
      type: "connection-request",
      title: pc.requester.fullName ?? "Someone",
      description: pc.requester.headline ?? "Wants to connect with you",
      href: "/connections",
      cta: locale === "id" ? "Tinjau" : "Review",
      count: pendingConnections.length,
    })
  }

  // Only one connection-request item total (not per-request)
  if (pendingConnections.length > 1) {
    // Deduplicate: keep only the first
    const firstConnReqIdx = actionItems.findIndex((a) => a.type === "connection-request")
    if (firstConnReqIdx >= 0) {
      actionItems.splice(firstConnReqIdx + 1) // remove subsequent connection request items
      actionItems[firstConnReqIdx] = {
        ...actionItems[firstConnReqIdx],
        title: `${pendingConnections.length} ${locale === "id" ? "permintaan koneksi" : "connection requests"}`,
        description: locale === "id" ? "Tinjau permintaan koneksi yang tertunda" : "Review pending connection requests",
      }
    }
  }

  // Unread notifications
  if (unreadNotifications > 0) {
    actionItems.push({
      id: "unread-notifs",
      priority: "medium",
      type: "unread-message",
      title: locale === "id" ? `${unreadNotifications} notifikasi belum dibaca` : `${unreadNotifications} unread notifications`,
      description: locale === "id" ? "Periksa notifikasi terbaru" : "Check your latest notifications",
      href: "/notifications",
      cta: locale === "id" ? "Lihat" : "View",
      count: unreadNotifications,
    })
  }

  // Upcoming opportunity deadlines
  const upcomingDeadlines = await db.application.findMany({
    where: {
      userProfileId: profile.id,
      deadline: { not: null },
      status: { notIn: ["rejected", "accepted", "withdrawn"] },
    },
    select: { id: true, position: true, organization: true, deadline: true, status: true },
    orderBy: { deadline: "asc" },
    take: 5,
  })

  const nowMs = Date.now()
  const upcomingWithDays = upcomingDeadlines.filter((a) => {
    if (!a.deadline) return false
    const d = new Date(a.deadline)
    if (isNaN(d.getTime())) return false
    const diffDays = Math.ceil((d.getTime() - nowMs) / (1000 * 60 * 60 * 24))
    return diffDays <= 7
  })

  for (const u of upcomingWithDays) {
    const d = new Date(u.deadline!)
    const diffDays = Math.ceil((d.getTime() - nowMs) / (1000 * 60 * 60 * 24))
    actionItems.push({
      id: `deadline-${u.id}`,
      priority: diffDays <= 2 ? "urgent" : "high",
      type: "deadline",
      title: u.position,
      description: `${u.organization ?? "—"} · ${diffDays <= 0 ? (locale === "id" ? "Hari ini!" : "Today!") : `${diffDays}d ${locale === "id" ? "lagi" : "left"}`}`,
      href: "/applications",
      cta: locale === "id" ? "Siapkan" : "Prepare",
      deadline: u.deadline ?? undefined,
    })
  }

  // Incomplete onboarding steps (profile completion < 80%)
  if (completion < 80) {
    actionItems.push({
      id: "incomplete-onboarding",
      priority: "medium",
      type: "onboarding-step",
      title: locale === "id" ? `Profil ${completion}% lengkap` : `Profile ${completion}% complete`,
      description: locale === "id" ? "Lengkapi profil untuk hasil yang lebih baik" : "Complete your profile for better results",
      href: "/profile",
      cta: locale === "id" ? "Lengkapi" : "Complete",
    })
  }

  // Sort: urgent -> high -> medium -> low
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
  actionItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  // ── Activity timeline from ActivityEvent store ───────────────────────
  const typeLabels: Record<string, string> = t.documents.types as Record<string, string>

  // Build timeline from activity events (preferred), fallback to on-the-fly
  const activityTimelineFromEvents = activityEvents.map((e: ActivityEventItem) => {
    const meta = e.metadata ?? {}
    return {
      id: `evt-${e.id}`,
      kind: (e.type.startsWith("document") ? "document"
        : e.type.startsWith("application") ? "application"
        : e.type.startsWith("interview") ? "interview"
        : e.type.startsWith("english") ? "english"
        : "document") as "document" | "application" | "interview" | "english",
      title: (meta.title as string) ?? e.type,
      subtitle: (meta.summary as string) ?? (e.resourceType ?? ""),
      href: e.resourceId && e.resourceType
        ? `/${e.resourceType.toLowerCase()}s/${e.resourceId}`
        : "/dashboard",
      timestamp: e.createdAt,
    }
  })

  // Fallback: build from recent data if activity events are empty
  const [recentDocs, recentApps, recentInterviews, recentEnglish] = activityTimelineFromEvents.length > 0
    ? [[], [], [], []]
    : await Promise.all([
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

  const timeline = activityTimelineFromEvents.length > 0
    ? activityTimelineFromEvents
    : buildActivityTimeline({
        documents: recentDocs,
        applications: recentApps,
        interviews: recentInterviews,
        english: recentEnglish,
        typeLabels,
      })

  // ── Network activity ─────────────────────────────────────────────────
  const networkEvents: NetworkEvent[] = recentConnectionEvents.map((c) => {
    const isRequester = c.requesterId === profile.id
    const otherPerson = isRequester ? c.addressee : c.requester
    return {
      id: `net-${c.id}`,
      type: "connection-accepted",
      name: otherPerson.fullName ?? "Someone",
      headline: otherPerson.headline ?? null,
      timestamp: c.updatedAt,
      profileId: isRequester ? c.addresseeId : c.requesterId,
    }
  })

  // ── Deadline alerts ──────────────────────────────────────────────────
  const deadlineAlerts: DeadlineAlert[] = upcomingDeadlines.map((a) => {
    const d = a.deadline ? new Date(a.deadline) : null
    const daysLeft = d ? Math.ceil((d.getTime() - nowMs) / (1000 * 60 * 60 * 24)) : 999
    return {
      id: a.id,
      position: a.position,
      organization: a.organization,
      deadline: a.deadline ?? "",
      daysLeft,
      status: a.status,
    }
  }).filter((a) => a.daysLeft <= 14)

  // ── Quick actions ──────────────────────────────────────────────────
  const quickActions = [
    { key: "cv", title: t.dashboard.qaCvTitle, desc: t.dashboard.qaCvDesc, href: "/documents/cv-ats/new", accent: "bg-chart-1/5" },
    { key: "app", title: t.dashboard.qaAppTitle, desc: t.dashboard.qaAppDesc, href: "/applications", accent: "bg-chart-2/5" },
    { key: "interview", title: t.dashboard.qaInterviewTitle, desc: t.dashboard.qaInterviewDesc, href: "/interview", accent: "bg-chart-4/5" },
    { key: "english", title: t.dashboard.qaEnglishTitle, desc: t.dashboard.qaEnglishDesc, href: "/english", accent: "bg-chart-3/5" },
  ]

  // ── Smart suggestions ──────────────────────────────────────────────
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

  // ── Verticals ──────────────────────────────────────────────────────
  const verticals = [
    { title: t.landing.v1Title, desc: t.landing.v1Desc, Icon: FileText, cta: t.dashboard.v1Cta, href: "/documents" },
    { title: t.landing.v2Title, desc: t.landing.v2Desc, Icon: ClipboardList, cta: t.dashboard.v2Cta, href: "/applications" },
    { title: t.landing.v3Title, desc: t.landing.v3Desc, Icon: MessageSquareText, cta: t.dashboard.v3Cta, href: "/interview" },
    { title: t.landing.v4Title, desc: t.landing.v4Desc, Icon: Headphones, cta: t.dashboard.v4Cta, href: "/english" },
    { title: t.landing.v5Title, desc: t.landing.v5Desc, Icon: PenLine, cta: t.dashboard.v5Cta, href: "/documents/essay/new" },
  ]

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

      {/* --- Quick Stats --- */}
      <QuickStats stats={quickStats} />

      {/* --- Action Center + Deadline Alerts --- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ActionCenter
          actions={actionItems}
          labels={{
            title: locale === "id" ? "Pusat Aksi" : "Action Center",
            empty: locale === "id" ? "Tidak ada aksi yang perlu dilakukan" : "No actions needed right now",
            acceptCta: locale === "id" ? "Terima" : "Accept",
            declineCta: locale === "id" ? "Tolak" : "Decline",
            viewAllCta: locale === "id" ? "Lihat semua" : "View all",
            urgent: locale === "id" ? "Penting" : "Urgent",
            high: locale === "id" ? "Tinggi" : "High",
            medium: locale === "id" ? "Sedang" : "Medium",
            low: locale === "id" ? "Rendah" : "Low",
            daysLeft: locale === "id" ? "hari lagi" : "days left",
            today: locale === "id" ? "Hari ini" : "Today",
            overdue: locale === "id" ? "Terlambat" : "Overdue",
          }}
        />
        <DeadlineAlerts
          alerts={deadlineAlerts}
          labels={{
            title: locale === "id" ? "Tenggat Waktu" : "Upcoming Deadlines",
            empty: locale === "id" ? "Tidak ada tenggat waktu mendatang" : "No upcoming deadlines",
            daysLeftSingular: locale === "id" ? "hari lagi" : "day left",
            daysLeftPlural: locale === "id" ? "hari lagi" : "days left",
            overdue: locale === "id" ? "Terlambat" : "Overdue",
            today: locale === "id" ? "Hari ini" : "Today",
            viewAll: locale === "id" ? "Lihat semua lamaran" : "View all applications",
          }}
        />
      </div>

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
            {/* Evidence-enhanced indicator */}
            {evidenceBoost > 0 && (
              <p className="mt-1 text-center text-[10px] text-chart-2" role="status" aria-label="Evidence quality bonus applied">
                +{evidenceBoost}% {locale === "id" ? "dari kualitas bukti" : "from evidence quality"}
              </p>
            )}
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

      {/* --- Network Activity --- */}
      <NetworkActivity
        events={networkEvents}
        labels={{
          title: locale === "id" ? "Aktivitas Jaringan" : "Network Activity",
          empty: locale === "id" ? "Belum ada aktivitas jaringan" : "No network activity yet",
          acceptedLabel: locale === "id" ? "Koneksi diterima" : "Connection accepted",
          newConnectionLabel: locale === "id" ? "Koneksi baru" : "New connection",
          viewAll: locale === "id" ? "Lihat semua koneksi" : "View all connections",
        }}
      />

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
