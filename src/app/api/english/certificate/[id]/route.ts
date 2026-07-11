import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  requireActor,
  findOwnedEnglishCertificate,
  handleAuthorizationError,
} from "@/lib/authorization"

/** GET /api/english/certificate/[id] — get certificate by ID (owner only). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor()
    const { id } = await params

    const cert = await findOwnedEnglishCertificate(id, actor)

    const profile = await db.userProfile.findUnique({
      where: { id: cert.userProfileId },
      select: { fullName: true },
    })

    return NextResponse.json(
      { certificate: cert, userName: profile?.fullName ?? null },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    )
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
