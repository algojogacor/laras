import { NextResponse } from "next/server"
import { z } from "zod"
import { createCompletion, extractJSON } from "@/lib/ai/deepseek"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"

const schema = z.object({
  jobDescription: z.string().min(20),
  locale: z.enum(["id", "en"]).optional(),
})

export async function POST(request: Request) {
  // Defense-in-depth: verify session explicitly (not just rely on middleware)
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  // Verify user profile exists (ensures user is fully onboarded)
  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) {
    return NextResponse.json({ error: "onboarding-required" }, { status: 403 })
  }

  let body: z.infer<typeof schema>
  try { body = schema.parse(await request.json()) } catch { return NextResponse.json({ error: "invalid-body" }, { status: 400 }) }

  const locale = body.locale || "id"
  const isID = locale === "id"

  const sys = isID
    ? `Kamu asisten rekrutmen. Dari teks lowongan yang diberikan user, ekstrak informasi penting. Output JSON saja.`
    : `You are a recruiting assistant. From the job description text the user provides, extract key info. Output JSON only.`

  const user = isID
    ? `Ekstrak dari teks lowongan ini. Output JSON: { "requirements": string[], "responsibilities": string[], "deadline": string|null, "contacts": string|null, "highlights": string }.\n\nTeks lowongan:\n${body.jobDescription}`
    : `Extract from this job description. Output JSON: { "requirements": string[], "responsibilities": string[], "deadline": string|null, "contacts": string|null, "highlights": string }.\n\nJob description:\n${body.jobDescription}`

  try {
    const completion = await createCompletion({
      messages: [
        { role: "assistant", content: sys },
        { role: "user", content: user },
      ],
    })
    const raw = completion.choices[0]?.message?.content ?? ""
    let s = raw.trim()
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fence) s = fence[1].trim()
    const first = s.indexOf("{"); const last = s.lastIndexOf("}")
    if (first !== -1 && last !== -1) s = s.slice(first, last + 1)
    const parsed = JSON.parse(s)
    return NextResponse.json({ ok: true, summary: parsed })
  } catch (e) {
    // Sanitized error: don't leak internal details to client
    console.error("[applications/summarize] AI generation failed:", (e as Error).message)
    return NextResponse.json({ error: "summarize-failed" }, { status: 502 })
  }
}
