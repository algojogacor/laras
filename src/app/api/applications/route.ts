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
  if (!profile) return NextResponse.json({ applications: [] })

  const applications = await db.application.findMany({
    where: { userProfileId: profile.id },
    orderBy: { order: "asc" },
  })
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
    })),
  })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "invalid-body" }, { status: 400 }) }

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const count = await db.application.count({ where: { userProfileId: profile.id } })
  const app = await db.application.create({
    data: {
      userProfileId: profile.id,
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
}
