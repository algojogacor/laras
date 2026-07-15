import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { getUserOrganizations } from "@/lib/organizations"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, Plus, Users, Globe, ShieldCheck } from "lucide-react"

const TYPE_LABELS: Record<string, string> = {
  institution: "Institution",
  company: "Company",
  community: "Community",
  government: "Government",
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  member: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

const VERIFICATION_LABELS: Record<string, string> = {
  unverified: "Unverified",
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
}

export default async function OrganizationsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) redirect("/onboarding")

  const { t } = await getLocaleAndDict()
  const orgs = await getUserOrganizations(profile.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organizations and workspaces
          </p>
        </div>
        <Button asChild>
          <Link href="/organizations/new">
            <Plus className="mr-2 h-4 w-4" />
            New Organization
          </Link>
        </Button>
      </div>

      {orgs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium mb-1">No organizations yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
              Create or join an organization to collaborate with your team,
              post opportunities, and manage members.
            </p>
            <Button asChild>
              <Link href="/organizations/new">
                <Plus className="mr-2 h-4 w-4" />
                Create your first organization
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {orgs.map((org) => (
            <Link key={org.id} href={`/organizations/${org.slug}`} className="block group">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base group-hover:text-primary transition-colors">
                          {org.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          @{org.slug}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={ROLE_COLORS[org.role] ?? "bg-gray-100"} variant="outline">
                      {org.role}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {org.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {org.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {org.memberCount} member{org.memberCount !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" />
                      {TYPE_LABELS[org.type] ?? org.type}
                    </span>
                    {org.verificationStatus === "verified" && (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verified
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
