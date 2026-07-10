import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { canAccessAdvancedEnglish } from "@/lib/entitlement"
import { EnglishHub } from "@/components/english/english-hub"

export default async function EnglishPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  const profile = await db.userProfile.findUnique({ where: { accountId: session.userId }, select: { id: true } })
  if (!profile) redirect("/onboarding")
  const { locale } = await getLocaleAndDict()
  const advancedAccess = await canAccessAdvancedEnglish(profile)
  const history = await db.englishSession.findMany({
    where: { userProfileId: profile.id, score: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, module: true, score: true, createdAt: true },
  })
  return <EnglishHub locale={locale} history={history.map((h) => ({ id: h.id, module: h.module, score: h.score ?? 0, createdAt: h.createdAt.toISOString() }))} canAccessHard={advancedAccess.allowed} />
}
