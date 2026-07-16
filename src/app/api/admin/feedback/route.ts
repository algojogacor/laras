import { NextRequest } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireActor, handleAuthorizationError, safeNextResponse } from "@/lib/authorization"
import { requireCapability } from "@/lib/permissions"

export async function GET() {
  try {
    const actor = await requireActor()
    await requireCapability(actor, "users.read")
    const feedback = await db.betaFeedback.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { userProfile: { select: { fullName: true, account: { select: { email: true } } } } } })
    return safeNextResponse({ feedback })
  } catch (error) { return handleAuthorizationError(error) }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireActor()
    await requireCapability(actor, "users.read")
    const body = z.object({ id: z.string().min(1), status: z.enum(["new", "reviewing", "resolved"]) }).safeParse(await request.json().catch(() => null))
    if (!body.success) return safeNextResponse({ error: "invalid-feedback" }, { status: 400 })
    const feedback = await db.betaFeedback.update({ where: { id: body.data.id }, data: { status: body.data.status }, select: { id: true, status: true } })
    return safeNextResponse({ feedback })
  } catch (error) { return handleAuthorizationError(error) }
}
