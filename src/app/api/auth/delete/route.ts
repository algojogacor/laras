import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession, clearSessionCookie } from "@/lib/auth"

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  // Cascades to UserProfile and all relations (Experience, Education, Skill, etc.)
  await db.account.delete({ where: { id: session.userId } })
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
}
