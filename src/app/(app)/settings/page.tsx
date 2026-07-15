import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import { getEntitlement } from "@/lib/entitlement"
import { SettingsForm } from "@/components/settings/settings-form"
import { LicenseCard } from "@/components/settings/license-card"
import { RedeemCode } from "@/components/settings/redeem-code"

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  const profile = (await db.userProfile.findUnique({
    where: { accountId: session.userId },
    include: { experiences: { orderBy: { order: "asc" } }, educations: { orderBy: { order: "asc" } }, skills: { orderBy: { order: "asc" } }, certifications: { orderBy: { order: "asc" } }, languages: { orderBy: { order: "asc" } } },
  })) as ProfileWithRelations | null
  if (!profile) redirect("/onboarding")

  const { t } = await getLocaleAndDict()
  const entitlement = await getEntitlement(profile)

  return (
    <div className="space-y-6">
      <LicenseCard
        plan={entitlement.plan}
        status={entitlement.status}
        expiresAt={entitlement.expiresAt ? entitlement.expiresAt.toISOString() : null}
        labels={{
          yourPlan: t.admin.yourPlan,
          currentPlan: t.admin.currentPlan,
          planDesc: t.admin.planDesc,
          planDescPro: t.admin.planDescPro,
          planDescOrg: t.admin.planDescOrg,
          featuresIncluded: t.admin.featuresIncluded,
          featDocUnlimited: t.admin.featDocUnlimited,
          featVisualCv: t.admin.featVisualCv,
          featInterviewUnlimited: t.admin.featInterviewUnlimited,
          featEnglishAdvanced: t.admin.featEnglishAdvanced,
          featPrioritySupport: t.admin.featPrioritySupport,
          upgradeTitle: t.admin.upgradeTitle,
          upgradeDesc: t.admin.upgradeDesc,
          contactAdmin: t.admin.contactAdmin,
          locked: t.admin.locked,
          expiresAt: t.admin.expiresAt,
          noExpiry: t.admin.noExpiry,
        }}
      />
      <RedeemCode
        labels={{
          redeemTitle: t.licenses.redeemTitle,
          redeemDesc: t.licenses.redeemDesc,
          redeemCode: t.licenses.redeemCode,
          codePlaceholder: t.licenses.codePlaceholder,
          redeemButton: t.licenses.redeemButton,
          redeeming: t.licenses.redeeming,
          redeemSuccess: t.licenses.redeemSuccess,
          redeemError: t.licenses.redeemError,
          redeemNotFound: t.licenses.redeemNotFound,
          redeemExpired: t.licenses.redeemExpired,
          redeemUsedUp: t.licenses.redeemUsedUp,
          redeemDuplicate: t.licenses.redeemDuplicate,
        }}
      />
      <SettingsForm initialProfile={serializeProfile(profile)} />
    </div>
  )
}
