import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  requireActor,
  findOwnedDocument,
  handleAuthorizationError,
} from "@/lib/authorization"

/** GET /api/documents/[id]/versions — list all versions of a document. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor()
    const { id } = await params

    const doc = await findOwnedDocument(id, actor)

    const versions = await db.documentVersion.findMany({
      where: { documentId: doc.id },
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
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
