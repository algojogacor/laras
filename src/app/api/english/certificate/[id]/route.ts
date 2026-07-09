import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"

/** GET /api/english/certificate/[id] — get certificate by ID (owner only). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params
  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true, fullName: true },
  })
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const cert = await db.englishCertificate.findFirst({
    where: { id, userProfileId: profile.id },
  })
  if (!cert) return NextResponse.json({ error: "not-found" }, { status: 404 })

  return NextResponse.json({ certificate: cert, userName: profile.fullName })
}
