import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { getMentorshipProfile, discoverMentors, getMentorshipRequests } from "@/lib/mentorship"
import { MentorshipPanel } from "@/components/mentorship/mentorship-panel"

export default async function MentorshipPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) redirect("/onboarding")

  const { t } = await getLocaleAndDict()
  const [myProfile, mentors, incoming, outgoing] = await Promise.all([
    getMentorshipProfile(profile.id),
    discoverMentors(),
    getMentorshipRequests(profile.id, "incoming"),
    getMentorshipRequests(profile.id, "outgoing"),
  ])

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.mentorship?.title || "Mentorship"}
        </h1>
        <p className="mt-1.5 text-muted-foreground">
          {t.mentorship?.subtitle || "Find mentors, schedule sessions, and grow together."}
        </p>
      </div>

      <MentorshipPanel
        initialMentors={mentors.map((m) => ({
          id: m.id,
          userProfileId: m.userProfileId,
          mentorTopics: m.mentorTopics,
          bio: m.bio,
          availability: m.availability,
          fullName: m.fullName ?? null,
          headline: m.headline ?? null,
          photoUrl: m.photoUrl ?? null,
        }))}
        myProfile={
          myProfile
            ? {
                isMentor: myProfile.isMentor,
                isMentee: myProfile.isMentee,
                mentorTopics: myProfile.mentorTopics,
                menteeGoals: myProfile.menteeGoals,
                bio: myProfile.bio,
                availability: myProfile.availability,
              }
            : null
        }
        incomingRequests={incoming.map((r) => ({
          id: r.id,
          menteeName: r.menteeName,
          message: r.message,
          status: r.status,
        }))}
        outgoingRequests={outgoing.map((r) => ({
          id: r.id,
          mentorName: r.mentorName,
          message: r.message,
          status: r.status,
        }))}
        labels={t.mentorship as any}
      />
    </div>
  )
}
