import "server-only"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"

/**
 * Normalizes the user's role to a known subset: "user", "admin", "owner".
 * Any unknown roles default to "user".
 */
export function normalizeRole(role: string | null | undefined): string {
  const r = (role || "").trim().toLowerCase()
  if (r === "admin" || r === "owner") return r
  return "user"
}

/**
 * Validates whether an ID matches the standard CUID format.
 * CUIDs start with 'c', consist of lowercase alphanumeric characters,
 * and have a length typically between 20 and 30.
 */
export function isValidId(id: string | null | undefined): boolean {
  if (!id || typeof id !== "string") return false
  const cuidRegex = /^c[a-z0-9]{20,30}$/
  return cuidRegex.test(id)
}

export type AuthErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT"

export class AuthorizationError extends Error {
  constructor(public code: AuthErrorCode, message?: string) {
    super(message || code)
    this.name = "AuthorizationError"
  }
}

export interface ActorContext {
  accountId: string
  profileId: string | null
  email: string
  role: string // normalized
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
    select: { id: true, email: true, role: true },
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
 * Throws FORBIDDEN if the actor does not have the required role.
 */
export function requireCurrentAdmin(actor: ActorContext): void {
  if (actor.role !== "admin" && actor.role !== "owner") {
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
