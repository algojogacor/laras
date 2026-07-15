import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { getCircle, getCircleMembers } from "@/lib/circles"
import { getCircleReviews } from "@/lib/peer-review"
import { CircleDetailPanel } from "@/components/circles/circle-detail-panel"

export default async function CircleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) redirect("/onboarding")

  const { t } = await getLocaleAndDict()
  const { id } = await params

  const [circle, members, reviews] = await Promise.all([
    getCircle(id, profile.id).catch(() => null),
    getCircleMembers(id, profile.id).catch(() => []),
    getCircleReviews(id, profile.id).catch(() => []),
  ])

  if (!circle) {
    redirect("/circles")
  }

  return (
    <div className="space-y-6 animate-rise">
      <CircleDetailPanel
        circle={circle}
        members={members as any}
        reviews={reviews as any}
        profileId={profile.id}
        labels={{
          title: t.circles.title,
          members: t.circles.members,
          memberCount: t.circles.memberCount.replace("{count}", String(circle.memberCount)),
          reviews: t.circles.reviews,
          requestReview: t.circles.requestReview,
          reviewPrompt: t.circles.reviewPrompt,
          reviewPromptPlaceholder: t.circles.reviewPromptPlaceholder,
          submitReview: t.circles.submitReview,
          reviewFeedback: t.circles.reviewFeedback,
          reviewFeedbackPlaceholder: t.circles.reviewFeedbackPlaceholder,
          clarity: t.circles.clarity,
          specificity: t.circles.specificity,
          actionability: t.circles.actionability,
          noReviews: t.circles.noReviews,
          requestSent: t.circles.requestSent,
          reviewSubmitted: t.circles.reviewSubmitted,
          roleAdmin: t.circles.roleAdmin,
          roleModerator: t.circles.roleModerator,
          roleMember: t.circles.roleMember,
          promote: t.circles.promote,
          demote: t.circles.demote,
          delete: t.circles.delete,
          join: t.circles.join,
          leave: t.circles.leave,
          error: t.circles.error,
        }}
      />
    </div>
  )
}
