import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) return NextResponse.json({ documents: [] })

  const documents = await db.document.findMany({
    where: { userProfileId: profile.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, type: true, title: true, version: true, createdAt: true, updatedAt: true,
      config: true,
    },
  })
  return NextResponse.json({
    documents: documents.map((d) => ({
      ...d,
      config: d.config ? JSON.parse(d.config) : {},
    })),
  })
}
