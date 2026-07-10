import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params
  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const doc = await db.document.findFirst({
    where: { id, userProfileId: profile.id },
  })
  if (!doc) return NextResponse.json({ error: "not-found" }, { status: 404 })

  // This also cascades to ApplicationDocument links
  await db.document.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
