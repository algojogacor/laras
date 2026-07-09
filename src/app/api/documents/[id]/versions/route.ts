import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"

/** GET /api/documents/[id]/versions — list all versions of a document. */
export async function GET(
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
    select: { id: true },
  })
  if (!doc) return NextResponse.json({ error: "not-found" }, { status: 404 })

  const versions = await db.documentVersion.findMany({
    where: { documentId: id },
    orderBy: { versionNumber: "desc" },
    select: {
      id: true,
      versionNumber: true,
      revisionInstruction: true,
      parentVersionId: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ versions })
}
