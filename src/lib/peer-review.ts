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

/**
 * Request a peer review within a circle.
 * Only circle members can request reviews.
 */
export async function requestReview(
  requesterId: string,
  circleId: string,
  prompt: string
): Promise<{ id: string }> {
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

  const review = await db.peerReview.create({
    data: {
      requesterId,
      circleId,
      prompt: trimmedPrompt,
    },
  })

  emitEvent({
    userProfileId: requesterId,
    type: "profile.update",
    resourceType: "PeerReview",
    resourceId: review.id,
    metadata: { action: "review.requested", circleId },
  })

  return { id: review.id }
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
  const review = await db.peerReview.findUnique({
    where: { id: requestId },
  })

  if (!review || review.status !== "open") {
    throw new AuthorizationError("NOT_FOUND")
  }

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

  await db.peerReview.update({
    where: { id: requestId },
    data: {
      reviewerId,
      feedback: trimmedFeedback,
      rating: JSON.stringify(validatedRating),
      status: "submitted",
    },
  })

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
  const reviews = await db.peerReview.findMany({
    where: {
      OR: [
        { requesterId: userProfileId },
        { reviewerId: userProfileId },
      ],
    },
    include: {
      reviewer: { select: { fullName: true } },
      requester: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return reviews.map((r) => ({
    id: r.id,
    requesterId: r.requesterId,
    reviewerId: r.reviewerId,
    circleId: r.circleId,
    prompt: r.prompt,
    feedback: r.feedback,
    rating: r.rating ? safeParseRating(r.rating) : null,
    status: r.status as "open" | "submitted",
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    reviewerName: r.reviewer?.fullName ?? null,
    requesterName: r.requester?.fullName ?? null,
  }))
}

/**
 * Get reviews for a specific circle.
 */
export async function getCircleReviews(
  circleId: string,
  userProfileId: string
): Promise<PeerReviewData[]> {
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

  const reviews = await db.peerReview.findMany({
    where: { circleId },
    include: {
      reviewer: { select: { fullName: true } },
      requester: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return reviews.map((r) => ({
    id: r.id,
    requesterId: r.requesterId,
    reviewerId: r.reviewerId,
    circleId: r.circleId,
    prompt: r.prompt,
    feedback: r.feedback,
    rating: r.rating ? safeParseRating(r.rating) : null,
    status: r.status as "open" | "submitted",
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    reviewerName: r.reviewer?.fullName ?? null,
    requesterName: r.requester?.fullName ?? null,
  }))
}
