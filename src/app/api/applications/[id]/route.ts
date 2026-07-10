import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id } = await params

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "invalid-body" }, { status: 400 }) }

  const profile = await db.userProfile.findUnique({ where: { accountId: session.userId }, select: { id: true } })
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const existing = await db.application.findFirst({ where: { id, userProfileId: profile.id } })
  if (!existing) return NextResponse.json({ error: "not-found" }, { status: 404 })

  const data: any = {}
  for (const k of ["type", "position", "organization", "status", "deadline", "location", "url", "jobDescription", "summary", "notes", "order"]) {
    if (k in body) data[k] = body[k]
  }

  const updated = await db.application.update({ where: { id }, data })
  return NextResponse.json({ ok: true, application: updated })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id } = await params

  const profile = await db.userProfile.findUnique({ where: { accountId: session.userId }, select: { id: true } })
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const existing = await db.application.findFirst({ where: { id, userProfileId: profile.id } })
  if (!existing) return NextResponse.json({ error: "not-found" }, { status: 404 })

  await db.application.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
