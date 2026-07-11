import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
} from "@/lib/authorization"

export async function GET() {
  try {
    const actor = await requireActor()
    if (!actor.profileId) {
      return NextResponse.json({ applications: [] })
    }

    const [applications, appDocs] = await Promise.all([
      db.application.findMany({
        where: { userProfileId: actor.profileId },
        orderBy: { order: "asc" },
      }),
      db.applicationDocument.findMany({
        where: { application: { userProfileId: actor.profileId } },
        select: { applicationId: true, documentId: true },
      }),
    ])

    const linkedMap: Record<string, string[]> = {}
    for (const ad of appDocs) {
      if (!linkedMap[ad.applicationId]) linkedMap[ad.applicationId] = []
      linkedMap[ad.applicationId].push(ad.documentId)
    }

    return NextResponse.json({
      applications: applications.map((a) => ({
        ...a,
        id: a.id,
        type: a.type,
        position: a.position,
        organization: a.organization,
        status: a.status,
        deadline: a.deadline,
        location: a.location,
        url: a.url,
        summary: a.summary,
        notes: a.notes,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        linkedDocIds: linkedMap[a.id] || [],
      })),
    })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "invalid-body" }, { status: 400 })
    }

    const count = await db.application.count({ where: { userProfileId: profileId } })
    const app = await db.application.create({
      data: {
        userProfileId: profileId,
        type: body.type || "work",
        position: body.position || "",
        organization: body.organization || null,
        status: body.status || "saved",
        deadline: body.deadline || null,
        location: body.location || null,
        url: body.url || null,
        jobDescription: body.jobDescription || null,
        summary: body.summary || null,
        notes: body.notes || null,
        order: count,
      },
    })
    return NextResponse.json({ ok: true, application: app })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
