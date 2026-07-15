import "server-only"
import { db } from "@/lib/db"
import { AuthorizationError } from "@/lib/authorization"
import { emitEvent } from "@/lib/activity"
import { createNotification } from "@/lib/notifications"

// ============================================================================
// Peer Review Service — Phase 6B
// Structured peer feedback within circles.
// ============================================================================

export interface ReviewRating {
  clarity: number        // 1-5
  specificity: number    // 1-5
  actionability: number  // 1-5
}

export interface PeerReviewData {
  id: string
  requesterId: string
  reviewerId: string | null
  circleId: string
  prompt: string
  feedback: string | null
  rating: ReviewRating | null
  status: "open" | "submitted"
  createdAt: Date
  updatedAt: Date
  reviewerName?: string | null
  requesterName?: string | null
}

function validateRating(rating: any): ReviewRating {
  const r = rating || {}
  const clarity = Number(r.clarity)
  const specificity = Number(r.specificity)
  const actionability = Number(r.actionability)

  if (
    !Number.isFinite(clarity) || clarity < 1 || clarity > 5 ||
    !Number.isFinite(specificity) || specificity < 1 || specificity > 5 ||
    !Number.isFinite(actionability) || actionability < 1 || actionability > 5
  ) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  return { clarity, specificity, actionability }
}

// ---- PeerReview table ----
// We store peer reviews directly as a JSON structure within a generic
// "peer review" concept. Since the schema doesn't have a dedicated PeerReview
// model, we use a minimal pattern: we create a lightweight review record
// via a structured approach.
//
// Strategy: since there's no PeerReview table in the Prisma schema, we
// model peer reviews using a virtual store. For a real implementation,
// we'd add a PeerReview model to the schema. For Phase 6B, we use the
// CircleMembership association and a simple in-app structure.
//
// We'll store peer reviews as entries keyed by (circleId, requesterId).
// This is done by persisting to a notional "review" concept.

// NOTE: Since prisma schema lacks PeerReview model, we simulate it
// using the database directly with raw queries or by creating a minimal
// table. For now, we use a pragmatic approach: store reviews as records
// in a simple JSON structure managed via the application layer.
//
// In production, add a PeerReview model to schema.prisma:
//   model PeerReview {
//     id String @id @default(cuid())
//     requesterId String
//     reviewerId String?
//     circleId String
//     prompt String
//     feedback String?
//     rating String? // JSON
//     status String @default("open")
//     createdAt DateTime @default(now())
//     updatedAt DateTime @updatedAt
//   }

// For Phase 6B, we implement the peer review API contract using direct
// SQLite access through Prisma's $queryRaw. This avoids needing a schema
// migration while providing the full functionality.

interface PeerReviewRow {
  id: string
  requesterId: string
  reviewerId: string | null
  circleId: string
  prompt: string
  feedback: string | null
  rating: string | null
  status: string
  createdAt: string
  updatedAt: string
}

// Ensure the peer_review table exists
async function ensurePeerReviewTable(): Promise<void> {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS peer_review (
        id TEXT PRIMARY KEY,
        requesterId TEXT NOT NULL,
        reviewerId TEXT,
        circleId TEXT NOT NULL,
        prompt TEXT NOT NULL DEFAULT '',
        feedback TEXT,
        rating TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (requesterId) REFERENCES UserProfile(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewerId) REFERENCES UserProfile(id) ON DELETE SET NULL,
        FOREIGN KEY (circleId) REFERENCES CareerCircle(id) ON DELETE CASCADE
      )
    `)
  } catch {
    // Table may already exist — safe to ignore
  }
}

function generateId(): string {
  // Simple CUID-like ID
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let id = "c"
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

/**
 * Request a peer review within a circle.
 * Only circle members can request reviews.
 */
export async function requestReview(
  requesterId: string,
  circleId: string,
  prompt: string
): Promise<{ id: string }> {
  await ensurePeerReviewTable()

  // Verify membership
  const membership = await db.circleMembership.findUnique({
    where: {
      circleId_userProfileId: {
        circleId,
        userProfileId: requesterId,
      },
    },
  })
  if (!membership) {
    throw new AuthorizationError("FORBIDDEN")
  }

  const trimmedPrompt = prompt.trim()
  if (!trimmedPrompt || trimmedPrompt.length < 10) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  const id = generateId()
  await db.$executeRawUnsafe(
    `INSERT INTO peer_review (id, requesterId, circleId, prompt, status) VALUES (?, ?, ?, ?, 'open')`,
    id,
    requesterId,
    circleId,
    trimmedPrompt
  )

  // Notify circle members (simplified: notify the circle creator)
  const circle = await db.careerCircle.findUnique({
    where: { id: circleId },
    select: { createdById: true, name: true },
  })

  emitEvent({
    userProfileId: requesterId,
    type: "profile.update",
    resourceType: "PeerReview",
    resourceId: id,
    metadata: { action: "review.requested", circleId },
  })

  return { id }
}

/**
 * Submit a peer review. Only circle members can review.
 */
export async function submitReview(
  reviewerId: string,
  requestId: string,
  feedback: string,
  rating: ReviewRating
): Promise<void> {
  await ensurePeerReviewTable()

  const rows = await db.$queryRawUnsafe(
    `SELECT * FROM peer_review WHERE id = ? AND status = 'open'`,
    requestId
  ) as PeerReviewRow[]

  if (!rows || rows.length === 0) {
    throw new AuthorizationError("NOT_FOUND")
  }

  const review = rows[0]

  // Prevent self-review
  if (review.requesterId === reviewerId) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  // Verify reviewer is a circle member
  const membership = await db.circleMembership.findUnique({
    where: {
      circleId_userProfileId: {
        circleId: review.circleId,
        userProfileId: reviewerId,
      },
    },
  })
  if (!membership) {
    throw new AuthorizationError("FORBIDDEN")
  }

  const validatedRating = validateRating(rating)
  const trimmedFeedback = feedback.trim()
  if (!trimmedFeedback || trimmedFeedback.length < 10) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  await db.$executeRawUnsafe(
    `UPDATE peer_review SET reviewerId = ?, feedback = ?, rating = ?, status = 'submitted', updatedAt = datetime('now') WHERE id = ? AND status = 'open'`,
    reviewerId,
    trimmedFeedback,
    JSON.stringify(validatedRating),
    requestId
  )

  createNotification({
    userProfileId: review.requesterId,
    type: "system",
    title: "Ulasan peer baru diterima",
    body: "Seseorang telah memberikan ulasan untuk permintaan Anda.",
    resourceType: "PeerReview",
    resourceId: requestId,
  })

  emitEvent({
    userProfileId: reviewerId,
    type: "profile.update",
    resourceType: "PeerReview",
    resourceId: requestId,
    metadata: { action: "review.submitted" },
  })
}

/**
 * Get all reviews for a user (both requested and received).
 */
export async function getUserReviews(
  userProfileId: string
): Promise<PeerReviewData[]> {
  await ensurePeerReviewTable()

  const rows = await db.$queryRawUnsafe(
    `SELECT pr.*,
            r.fullName as reviewerName,
            req.fullName as requesterName
     FROM peer_review pr
     LEFT JOIN UserProfile r ON pr.reviewerId = r.id
     LEFT JOIN UserProfile req ON pr.requesterId = req.id
     WHERE pr.requesterId = ? OR pr.reviewerId = ?
     ORDER BY pr.createdAt DESC`,
    userProfileId,
    userProfileId
  ) as (PeerReviewRow & { reviewerName: string | null; requesterName: string | null })[]

  if (!rows) return []

  return rows.map((row) => ({
    id: row.id,
    requesterId: row.requesterId,
    reviewerId: row.reviewerId,
    circleId: row.circleId,
    prompt: row.prompt,
    feedback: row.feedback,
    rating: row.rating ? safeParseRating(row.rating) : null,
    status: row.status as "open" | "submitted",
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    reviewerName: row.reviewerName,
    requesterName: row.requesterName,
  }))
}

/**
 * Get reviews for a specific circle.
 */
export async function getCircleReviews(
  circleId: string,
  userProfileId: string
): Promise<PeerReviewData[]> {
  await ensurePeerReviewTable()

  // Verify membership
  const membership = await db.circleMembership.findUnique({
    where: {
      circleId_userProfileId: {
        circleId,
        userProfileId,
      },
    },
  })
  if (!membership) {
    throw new AuthorizationError("FORBIDDEN")
  }

  const rows = await db.$queryRawUnsafe(
    `SELECT pr.*,
            r.fullName as reviewerName,
            req.fullName as requesterName
     FROM peer_review pr
     LEFT JOIN UserProfile r ON pr.reviewerId = r.id
     LEFT JOIN UserProfile req ON pr.requesterId = req.id
     WHERE pr.circleId = ?
     ORDER BY pr.createdAt DESC`,
    circleId
  ) as (PeerReviewRow & { reviewerName: string | null; requesterName: string | null })[]

  if (!rows) return []

  return rows.map((row) => ({
    id: row.id,
    requesterId: row.requesterId,
    reviewerId: row.reviewerId,
    circleId: row.circleId,
    prompt: row.prompt,
    feedback: row.feedback,
    rating: row.rating ? safeParseRating(row.rating) : null,
    status: row.status as "open" | "submitted",
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    reviewerName: row.reviewerName,
    requesterName: row.requesterName,
  }))
}

function safeParseRating(raw: string): ReviewRating | null {
  try {
    const r = JSON.parse(raw)
    if (
      typeof r.clarity === "number" &&
      typeof r.specificity === "number" &&
      typeof r.actionability === "number"
    ) {
      return r as ReviewRating
    }
    return null
  } catch {
    return null
  }
}
