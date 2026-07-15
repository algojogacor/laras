import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { CreateOrganizationForm } from "./create-form"

export default async function NewOrganizationPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) redirect("/onboarding")

  const { t } = await getLocaleAndDict()

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Organization</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set up a workspace for your institution, company, or community.
        </p>
      </div>
      <CreateOrganizationForm />
    </div>
  )
}
