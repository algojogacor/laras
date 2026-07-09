import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id } = await params
  const profile = await db.userProfile.findUnique({ where: { accountId: session.userId }, select: { id: true } })
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })
  const set = await db.interviewSet.findFirst({
    where: { id, userProfileId: profile.id },
    include: { questions: { orderBy: { order: "asc" } } },
  })
  if (!set) return NextResponse.json({ error: "not-found" }, { status: 404 })
  return NextResponse.json({ set })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id } = await params
  const profile = await db.userProfile.findUnique({ where: { accountId: session.userId }, select: { id: true } })
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })
  const existing = await db.interviewSet.findFirst({ where: { id, userProfileId: profile.id } })
  if (!existing) return NextResponse.json({ error: "not-found" }, { status: 404 })
  await db.interviewSet.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
