import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { generateInterviewQuestions } from "@/lib/content-engine"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const profile = await db.userProfile.findUnique({ where: { accountId: session.userId }, select: { id: true } })
  if (!profile) return NextResponse.json({ sets: [] })
  const sets = await db.interviewSet.findMany({
    where: { userProfileId: profile.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { questions: true } } },
  })
  return NextResponse.json({ sets: sets.map((s) => ({ ...s, questionCount: s._count.questions })) })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "invalid-body" }, { status: 400 }) }
  const profile = await db.userProfile.findUnique({ where: { accountId: session.userId }, select: { id: true, docLocale: true } })
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const locale = (body.locale as "id" | "en") || (profile.docLocale as "id" | "en") || "id"
  const set = await db.interviewSet.create({
    data: {
      userProfileId: profile.id,
      title: body.title || body.role || "Interview session",
      role: body.role || null,
      context: body.context || null,
    },
  })

  // Generate questions
  const questions = await generateInterviewQuestions({
    locale,
    role: body.role || "",
    context: body.context || "",
    count: 6,
  })

  if (questions.length > 0) {
    await db.interviewQuestion.createMany({
      data: questions.map((q, i) => ({
        interviewSetId: set.id,
        question: q.question,
        category: q.category,
        order: i,
      })),
    })
  }

  const fullSet = await db.interviewSet.findUnique({
    where: { id: set.id },
    include: { questions: { orderBy: { order: "asc" } } },
  })
  return NextResponse.json({ ok: true, set: fullSet })
}
