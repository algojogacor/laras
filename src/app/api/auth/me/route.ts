import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 })
  }
  const account = await db.account.findUnique({
    where: { id: session.userId },
    include: {
      profile: {
        select: {
          fullName: true,
          onboardingComplete: true,
          onboardingStep: true,
          profileCompletion: true,
          uiLocale: true,
        },
      },
    },
  })
  if (!account) {
    return NextResponse.json({ user: null }, { status: 200 })
  }
  return NextResponse.json({
    user: {
      id: account.id,
      email: account.email,
      name: account.name,
      fullName: account.profile?.fullName ?? null,
      onboardingComplete: account.profile?.onboardingComplete ?? false,
      onboardingStep: account.profile?.onboardingStep ?? 0,
      profileCompletion: account.profile?.profileCompletion ?? 0,
      uiLocale: account.profile?.uiLocale ?? "id",
    },
  })
}
