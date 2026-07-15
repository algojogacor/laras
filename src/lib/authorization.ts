import "server-only"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"

// ============================================================================
// CANONICAL ROLE MODEL — Phase 1D
// ============================================================================

/** Exact four-role union. Every code path must use this set. */
export const CANONICAL_ROLES = ["owner", "admin", "moderator", "user"] as const
export type CanonicalRole = (typeof CANONICAL_ROLES)[number]

/**
 * Fail-closed role normalization.
 *
 * Only exact lowercase matches against the canonical four-role set are
 * recognised.  Unknown, malformed, empty, null, legacy, uppercase, and
 * whitespace-padded values all fail closed to "user".
 *
 * This function MUST NOT use prefix, substring, regex, truthy, or numeric
 * matching.  Role changes take effect on the next request because every
 * request reloads the current Account row — the JWT carries no role claim.
 */
export function normalizeRole(role: string | null | undefined): CanonicalRole {
  if (
    role === "owner" ||
    role === "admin" ||
    role === "moderator" ||
    role === "user"
  ) {
    return role
  }
  return "user"
}

/** Returns true ONLY for the exact canonical "owner" role. */
export function isOwnerRole(role: string | null | undefined): role is "owner" {
  return role === "owner"
}

/**
 * Returns true for owner OR admin.  Moderator, user, unknown, and anonymous
 * all return false.  This is the gate for the existing /api/admin/* surface.
 */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin"
}

/**
 * Validates whether an ID matches the standard CUID1 format.
 * CUID1s start with 'c', consist of 24 lowercase alphanumeric characters,
 * for a total length of exactly 25.
 */
export function isValidId(id: string | null | undefined): id is string {
  if (!id || typeof id !== "string") return false
  const cuidRegex = /^c[a-z0-9]{24}$/
  return cuidRegex.test(id)
}

export type AuthErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT"

export class AuthorizationError extends Error {
  constructor(public code: AuthErrorCode, message?: string) {
    super(message || code)
    this.name = "AuthorizationError"
  }
}

/**
 * Response helper that always applies Cache-Control: private, no-store
 * to prevent authenticated sensitive responses from being cached.
 */
export function safeNextResponse(
  body: unknown,
  init?: ResponseInit
): NextResponse {
  const headers = new Headers(init?.headers)
  headers.set("Cache-Control", "private, no-store")
  return NextResponse.json(body, { ...init, headers })
}

/**
 * Centralized, exhaustive HTTP response mapping for authorization errors and unknown errors.
 * All responses include Cache-Control: private, no-store.
 */
export function handleAuthorizationError(error: unknown): Response {
  const defaultHeaders = {
    "Content-Type": "application/json",
    "Cache-Control": "private, no-store",
  }
  if (error instanceof AuthorizationError) {
    switch (error.code) {
      case "UNAUTHORIZED":
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: defaultHeaders,
        })
      case "FORBIDDEN":
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: defaultHeaders,
        })
      case "NOT_FOUND":
        return new Response(JSON.stringify({ error: "not-found" }), {
          status: 404,
          headers: defaultHeaders,
        })
      case "BAD_REQUEST":
        return new Response(JSON.stringify({ error: "invalid-id" }), {
          status: 400,
          headers: defaultHeaders,
        })
      case "CONFLICT":
        return new Response(JSON.stringify({ error: "conflict" }), {
          status: 409,
          headers: defaultHeaders,
        })
    }
  }
  return new Response(JSON.stringify({ error: "internal-server-error" }), {
    status: 500,
    headers: defaultHeaders,
  })
}


export interface ActorContext {
  accountId: string
  profileId: string | null
  email: string
  role: CanonicalRole // normalized
}

/**
 * Resolves the ActorContext from the current session.
 * Throws UNAUTHORIZED if the session is missing or the underlying account is gone.
 */
export async function requireActor(): Promise<ActorContext> {
  const session = await getSession()
  if (!session) {
    throw new AuthorizationError("UNAUTHORIZED")
  }

  const account = await db.account.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, role: true, suspended: true },
  })
  if (!account) {
    throw new AuthorizationError("UNAUTHORIZED")
  }

  const profile = await db.userProfile.findUnique({
    where: { accountId: account.id },
    select: { id: true },
  })

  return {
    accountId: account.id,
    profileId: profile?.id || null,
    email: account.email,
    role: normalizeRole(account.role),
  }
}

/**
 * Enforces that the actor has admin or owner privileges.
 * Moderator, user, unknown role, and anonymous all receive FORBIDDEN.
 * Throws FORBIDDEN if the actor does not have the required role.
 */
export function requireCurrentAdmin(actor: ActorContext): void {
  if (!isAdminRole(actor.role)) {
    throw new AuthorizationError("FORBIDDEN")
  }
}

/**
 * Enforces that the actor has the exact owner role.
 * Admin, moderator, user, unknown role, and anonymous all receive FORBIDDEN.
 * Throws FORBIDDEN if the actor is not the owner.
 */
export function requireCurrentOwner(actor: ActorContext): void {
  if (!isOwnerRole(actor.role)) {
    throw new AuthorizationError("FORBIDDEN")
  }
}

/**
 * Extracts and returns the profileId from the actor, throwing NOT_FOUND if missing.
 */
export function getRequiredProfileId(actor: ActorContext): string {
  if (!actor.profileId) {
    throw new AuthorizationError("NOT_FOUND")
  }
  return actor.profileId
}

// ============================================================================
// OWNER-SCOPED RESOURCE LOADERS
// ============================================================================

export async function findOwnedDocument(id: string, actor: ActorContext) {
  if (!isValidId(id)) {
    throw new AuthorizationError("BAD_REQUEST")
  }
  const profileId = getRequiredProfileId(actor)
  const doc = await db.document.findFirst({
    where: { id, userProfileId: profileId },
    select: {
      id: true,
      userProfileId: true,
      type: true,
      title: true,
      content: true,
      config: true,
      fileUrl: true,
      version: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!doc) {
    throw new AuthorizationError("NOT_FOUND")
  }
  return doc
}

export async function findOwnedDocumentOfType(id: string, type: string, actor: ActorContext) {
  const doc = await findOwnedDocument(id, actor)
  if (doc.type !== type) {
    throw new AuthorizationError("NOT_FOUND")
  }
  return doc
}

// ============================================================================
// MODERATION & SUSPENSION GUARDS — Phase 4B+4C
// ============================================================================

/**
 * Enforces that the actor has moderator, admin, or owner privileges.
 * User, unknown role, and anonymous all receive FORBIDDEN.
 */
export function requireModeratorOrAbove(actor: ActorContext): void {
  if (actor.role !== "moderator" && actor.role !== "admin" && actor.role !== "owner") {
    throw new AuthorizationError("FORBIDDEN")
  }
}

/**
 * Enforces that the current user is not suspended.
 * Redirect-safety: throws FORBIDDEN so the layout can catch it.
 */
export async function requireUnsuspended(): Promise<void> {
  const session = await getSession()
  if (!session) return // Not authenticated is handled separately
  if (session.suspended) {
    throw new AuthorizationError("FORBIDDEN")
  }
}

export async function findOwnedApplication(id: string, actor: ActorContext) {
  if (!isValidId(id)) {
    throw new AuthorizationError("BAD_REQUEST")
  }
  const profileId = getRequiredProfileId(actor)
  const app = await db.application.findFirst({
    where: { id, userProfileId: profileId },
    select: {
      id: true,
      userProfileId: true,
      type: true,
      position: true,
      organization: true,
      status: true,
      deadline: true,
      location: true,
      url: true,
      jobDescription: true,
      summary: true,
      notes: true,
      order: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!app) {
    throw new AuthorizationError("NOT_FOUND")
  }
  return app
}

export async function findOwnedInterviewSet(id: string, actor: ActorContext) {
  if (!isValidId(id)) {
    throw new AuthorizationError("BAD_REQUEST")
  }
  const profileId = getRequiredProfileId(actor)
  const set = await db.interviewSet.findFirst({
    where: { id, userProfileId: profileId },
    select: {
      id: true,
      userProfileId: true,
      title: true,
      role: true,
      context: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!set) {
    throw new AuthorizationError("NOT_FOUND")
  }
  return set
}

export async function findOwnedEnglishSession(id: string, actor: ActorContext) {
  if (!isValidId(id)) {
    throw new AuthorizationError("BAD_REQUEST")
  }
  const profileId = getRequiredProfileId(actor)
  const session = await db.englishSession.findFirst({
    where: { id, userProfileId: profileId },
    select: {
      id: true,
      userProfileId: true,
      module: true,
      passage: true,
      questions: true,
      audioUrl: true,
      userAnswers: true,
      score: true,
      createdAt: true,
    },
  })
  if (!session) {
    throw new AuthorizationError("NOT_FOUND")
  }
  return session
}

export async function findOwnedEnglishCertificate(id: string, actor: ActorContext) {
  if (!isValidId(id)) {
    throw new AuthorizationError("BAD_REQUEST")
  }
  const profileId = getRequiredProfileId(actor)
  const cert = await db.englishCertificate.findFirst({
    where: { id, userProfileId: profileId },
    select: {
      id: true,
      userProfileId: true,
      sessionId: true,
      certificateId: true,
      title: true,
      testMode: true,
      testSpec: true,
      rawScore: true,
      percentage: true,
      estimatedCEFR: true,
      estimatedTOEFL: true,
      estimatedIELTS: true,
      confidence: true,
      skillBreakdown: true,
      questionCount: true,
      disclaimerText: true,
      pdfStoragePath: true,
      pdfUrl: true,
      status: true,
      issuedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!cert) {
    throw new AuthorizationError("NOT_FOUND")
  }
  return cert
}

// ============================================================================
// NESTED AND RELATION LOADERS
// ============================================================================

export async function findOwnedInterviewQuestion(
  questionId: string,
  interviewSetId: string,
  actor: ActorContext
) {
  if (!isValidId(questionId) || !isValidId(interviewSetId)) {
    throw new AuthorizationError("BAD_REQUEST")
  }
  const profileId = getRequiredProfileId(actor)
  const question = await db.interviewQuestion.findFirst({
    where: {
      id: questionId,
      interviewSetId: interviewSetId,
      interviewSet: {
        userProfileId: profileId,
      },
    },
    select: {
      id: true,
      interviewSetId: true,
      question: true,
      category: true,
      suggestedAnswer: true,
      userAnswer: true,
      feedback: true,
      order: true,
    },
  })
  if (!question) {
    throw new AuthorizationError("NOT_FOUND")
  }
  return question
}

export async function findOwnedApplicationDocumentPair(
  applicationId: string,
  documentId: string,
  actor: ActorContext
) {
  if (!isValidId(applicationId) || !isValidId(documentId)) {
    throw new AuthorizationError("BAD_REQUEST")
  }
  const profileId = getRequiredProfileId(actor)

  const [app, doc] = await Promise.all([
    db.application.findFirst({
      where: { id: applicationId, userProfileId: profileId },
      select: { id: true },
    }),
    db.document.findFirst({
      where: { id: documentId, userProfileId: profileId },
      select: { id: true },
    }),
  ])

  if (!app || !doc) {
    throw new AuthorizationError("NOT_FOUND")
  }

  return { applicationId: app.id, documentId: doc.id }
}
