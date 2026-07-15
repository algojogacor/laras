import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { getCircles, getUserCircles } from "@/lib/circles"
import { CirclesPanel } from "@/components/circles/circles-panel"

export default async function CirclesPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) redirect("/onboarding")

  const { t } = await getLocaleAndDict()
  const [available, myCircles] = await Promise.all([
    getCircles(),
    getUserCircles(profile.id),
  ])

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.circles.title}
        </h1>
        <p className="mt-1.5 text-muted-foreground">{t.circles.subtitle}</p>
      </div>

      <CirclesPanel
        initialCircles={available.map((c) => ({ ...c, userRole: c.userRole }))}
        myCircles={myCircles.map((c) => ({ ...c, userRole: c.userRole }))}
        profileId={profile.id}
        labels={t.circles as any}
      />
    </div>
  )
}
