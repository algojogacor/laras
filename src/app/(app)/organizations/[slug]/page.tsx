import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { getOrganization, getUserOrganizations } from "@/lib/organizations"
import { OrganizationDetail } from "./org-detail"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await getSession()
  if (!session) redirect("/login")

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) redirect("/onboarding")

  const { t } = await getLocaleAndDict()

  const org = await getOrganization(slug)
  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-xl font-semibold mb-2">Organization not found</h2>
        <p className="text-sm text-muted-foreground mb-4">
          The organization you are looking for does not exist.
        </p>
        <Button asChild variant="outline">
          <Link href="/organizations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Organizations
          </Link>
        </Button>
      </div>
    )
  }

  // Get user's role in this org
  let currentUserRole: string | null = null
  const memberships = await db.organizationMembership.findMany({
    where: { userProfileId: profile.id },
    select: { organizationId: true, role: true },
  })
  const membership = memberships.find((m) => m.organizationId === org.id)
  if (membership) {
    currentUserRole = membership.role
  }

  // Load members
  let members: Array<{
    id: string
    role: string
    joinedAt: string
    userProfile: {
      id: string
      fullName: string | null
      headline: string | null
      photoUrl: string | null
    }
  }> = []

  if (currentUserRole) {
    const rawMembers = await db.organizationMembership.findMany({
      where: { organizationId: org.id },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      include: {
        userProfile: {
          select: {
            id: true,
            fullName: true,
            headline: true,
            photoUrl: true,
          },
        },
      },
    })
    members = rawMembers.map((m) => ({
      ...m,
      joinedAt: m.joinedAt.toISOString(),
    }))
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/organizations">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Organizations
        </Link>
      </Button>

      <OrganizationDetail
        organization={{
          id: org.id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          logoUrl: org.logoUrl,
          website: org.website,
          type: org.type,
          verificationStatus: org.verificationStatus,
          verifiedAt: org.verifiedAt?.toISOString() ?? null,
          createdAt: org.createdAt.toISOString(),
          updatedAt: org.updatedAt.toISOString(),
          memberCount: org._count?.memberships ?? 0,
        }}
        currentUserRole={currentUserRole}
        currentUserId={profile.id}
        members={members}
      />
    </div>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const org = await getOrganization(slug)
  return {
    title: org ? `${org.name} — Organizations` : "Organization",
  }
}
