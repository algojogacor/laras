import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { db } from "@/lib/db"
import { isValidId } from "@/lib/authorization"
import { OpportunityDetailClient } from "./detail-client"

export interface OpportunityWithMatch {
  id: string
  type: string
  title: string
  organization: string | null
  description: string | null
  requirements: string | null
  deadline: string | null
  location: string | null
  url: string | null
  source: string
  status: string
  matchScore: number | null
  matchDetail: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true, onboardingComplete: true },
  })
  if (!profile) redirect("/onboarding")
  if (!profile.onboardingComplete) redirect("/onboarding")

  const { id } = await params

  if (!isValidId(id)) {
    return <NotFoundView />
  }

  const opportunity = await db.opportunity.findFirst({
    where: { id, userProfileId: profile.id },
    select: {
      id: true,
      type: true,
      title: true,
      organization: true,
      description: true,
      requirements: true,
      deadline: true,
      location: true,
      url: true,
      source: true,
      status: true,
      matchScore: true,
      matchDetail: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!opportunity) {
    return <NotFoundView />
  }

  const { t, locale } = await getLocaleAndDict()
  const isId = locale === "id"

  const tOpp = t.opportunities ?? {}

  const oppData: OpportunityWithMatch = {
    ...opportunity,
    createdAt: opportunity.createdAt.toISOString(),
    updatedAt: opportunity.updatedAt.toISOString(),
  }

  let matchDetail = null
  if (opportunity.matchDetail) {
    try {
      matchDetail = JSON.parse(opportunity.matchDetail)
    } catch {
      matchDetail = null
    }
  }

  return (
    <OpportunityDetailClient
      opportunity={oppData}
      matchDetail={matchDetail}
      isId={isId}
      t={tOpp}
    />
  )
}

function NotFoundView() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">
        Tidak ditemukan
      </h1>
      <p className="text-sm text-muted-foreground max-w-md">
        Kesempatan tidak ditemukan atau kamu tidak memiliki akses.
      </p>
      <a
        href="/opportunities"
        className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Kembali ke daftar kesempatan
      </a>
    </div>
  )
}
