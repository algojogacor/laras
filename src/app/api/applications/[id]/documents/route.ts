import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  requireActor,
  getRequiredProfileId,
  isValidId,
  AuthorizationError,
  handleAuthorizationError,
  safeNextResponse
} from "@/lib/authorization"

/** Link a document to an application. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const { id: appId } = await params
    if (!isValidId(appId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    let body: { documentId?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const documentId = body.documentId
    if (!isValidId(documentId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const link = await db.$transaction(async (tx) => {
      // Verify caller ownership of both parent resources
      const [app, doc] = await Promise.all([
        tx.application.findFirst({
          where: { id: appId, userProfileId: profileId },
          select: { id: true },
        }),
        tx.document.findFirst({
          where: { id: documentId, userProfileId: profileId },
          select: { id: true },
        }),
      ])

      if (!app || !doc) {
        throw new AuthorizationError("NOT_FOUND")
      }

      // Check for duplicate link
      const existing = await tx.applicationDocument.findFirst({
        where: { applicationId: appId, documentId },
      })
      if (existing) {
        throw new AuthorizationError("CONFLICT")
      }

      return tx.applicationDocument.create({
        data: { applicationId: appId, documentId },
      })
    })

    return safeNextResponse({ ok: true, link })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/** Unlink a document from an application. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const { id: appId } = await params
    if (!isValidId(appId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get("documentId")
    if (!isValidId(documentId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    await db.$transaction(async (tx) => {
      // Verify caller ownership of both parent resources
      const [app, doc] = await Promise.all([
        tx.application.findFirst({
          where: { id: appId, userProfileId: profileId },
          select: { id: true },
        }),
        tx.document.findFirst({
          where: { id: documentId, userProfileId: profileId },
          select: { id: true },
        }),
      ])

      if (!app || !doc) {
        throw new AuthorizationError("NOT_FOUND")
      }

      // Check if the link exists
      const existing = await tx.applicationDocument.findFirst({
        where: { applicationId: appId, documentId },
      })
      if (!existing) {
        throw new AuthorizationError("NOT_FOUND")
      }

      await tx.applicationDocument.delete({
        where: { id: existing.id },
      })
    })

    return safeNextResponse({ ok: true })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
