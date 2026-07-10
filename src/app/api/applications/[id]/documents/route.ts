import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"

/** Link a document to an application. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id: appId } = await params
  let body: { documentId?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: "invalid-body" }, { status: 400 }) }

  const profile = await db.userProfile.findUnique({ where: { accountId: session.userId }, select: { id: true } })
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const app = await db.application.findFirst({ where: { id: appId, userProfileId: profile.id } })
  if (!app) return NextResponse.json({ error: "not-found" }, { status: 404 })
  const doc = await db.document.findFirst({ where: { id: body.documentId, userProfileId: profile.id } })
  if (!doc) return NextResponse.json({ error: "doc-not-found" }, { status: 404 })

  const link = await db.applicationDocument.create({
    data: { applicationId: appId, documentId: body.documentId! },
  })
  return NextResponse.json({ ok: true, link })
}

/** Unlink a document from an application. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id: appId } = await params
  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get("documentId")
  if (!documentId) return NextResponse.json({ error: "missing-documentId" }, { status: 400 })

  const profile = await db.userProfile.findUnique({ where: { accountId: session.userId }, select: { id: true } })
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })
  const app = await db.application.findFirst({ where: { id: appId, userProfileId: profile.id } })
  if (!app) return NextResponse.json({ error: "not-found" }, { status: 404 })

  await db.applicationDocument.deleteMany({ where: { applicationId: appId, documentId } })
  return NextResponse.json({ ok: true })
}
