import { redirect } from "next/navigation"
import { getSession, isAdminRole } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { AdminTabs } from "@/components/admin/admin-tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ShieldAlert, ArrowLeft } from "lucide-react"

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect("/login?next=/admin")

  const { t } = await getLocaleAndDict()

  if (!isAdminRole(session.role)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md shadow-soft">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-semibold">{t.admin.forbidden}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{t.admin.forbiddenDesc}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                {t.admin.backHome}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.admin.title}
        </h1>
        <p className="mt-1.5 text-muted-foreground">{t.admin.subtitle}</p>
      </div>

      <AdminTabs
        verificationLabels={{
          title: t.admin.title,
          subtitle: t.admin.subtitle,
          usersTitle: t.admin.usersTitle,
          usersDesc: t.admin.usersDesc,
          userCol: t.admin.userCol,
          roleCol: t.admin.roleCol,
          badgesCol: t.admin.badgesCol,
          actionsCol: t.admin.actionsCol,
          manageBadges: t.admin.manageBadges,
          searchPlaceholder: t.admin.searchPlaceholder,
          noUsers: t.admin.noUsers,
          roleUser: t.admin.roleUser,
          roleAdmin: t.admin.roleAdmin,
          roleOwner: t.admin.roleOwner,
          verified: t.admin.verified,
          pending: t.admin.pending,
          rejected: t.admin.rejected,
          expired: t.admin.expired,
          setVerified: t.admin.setVerified,
          setRejected: t.admin.setRejected,
          noteLabel: t.admin.noteLabel,
          notePlaceholder: t.admin.notePlaceholder,
          saved: t.admin.saved,
          error: t.admin.error,
          statsUsers: t.admin.statsUsers,
          statsVerified: t.admin.statsVerified,
          statsPending: t.admin.statsPending,
          onboardingDone: t.admin.onboardingDone,
          profileComplete: t.admin.profileComplete,
          badgeIdentity: t.admin.badgeIdentity,
          badgeEmail: t.admin.badgeEmail,
          badgePhone: t.admin.badgePhone,
          badgeEducation: t.admin.badgeEducation,
          badgeEmployment: t.admin.badgeEmployment,
          badgeSkill: t.admin.badgeSkill,
          currentBadge: t.admin.currentBadge,
          noBadge: t.admin.noBadge,
          selectType: t.admin.selectType,
          selectStatus: t.admin.selectStatus,
        }}
        licenseLabels={{
          licensesTitle: t.admin.licensesTitle,
          licensesDesc: t.admin.licensesDesc,
          grantLicense: t.admin.grantLicense,
          editLicense: t.admin.editLicense,
          noLicenses: t.admin.noLicenses,
          plan: t.admin.plan,
          planFree: t.admin.planFree,
          planPro: t.admin.planPro,
          planOrg: t.admin.planOrg,
          statusActive: t.admin.statusActive,
          statusSuspended: t.admin.statusSuspended,
          statusExpired: t.admin.statusExpired,
          statusCancelled: t.admin.statusCancelled,
          expiresAt: t.admin.expiresAt,
          noExpiry: t.admin.noExpiry,
          licenseNote: t.admin.licenseNote,
          selectPlan: t.admin.selectPlan,
          selectStatus2: t.admin.selectStatus2,
          expiryDate: t.admin.expiryDate,
          licenseGranted: t.admin.licenseGranted,
          licenseUpdated: t.admin.licenseUpdated,
          licenseError: t.admin.licenseError,
          suspend: t.admin.suspend,
          reactivate: t.admin.reactivate,
          cancel: t.admin.cancel,
        }}
      />
    </div>
  )
}
