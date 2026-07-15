import "server-only"
import { db } from "@/lib/db"
import { AuthorizationError } from "@/lib/authorization"
import { emitEvent } from "@/lib/activity"
import { createNotification } from "@/lib/notifications"

// ============================================================================
// Mentorship Service — Phase 6C
// Mentor discovery, requests, and session management.
// ============================================================================

export interface MentorshipProfileData {
  id: string
  userProfileId: string
  isMentor: boolean
  isMentee: boolean
  mentorTopics: string[] | null
  menteeGoals: { goal: string; timeline?: string }[] | null
  bio: string | null
  availability: string | null
  createdAt: Date
  updatedAt: Date
  fullName?: string | null
  headline?: string | null
  photoUrl?: string | null
}

export interface MentorshipRequestData {
  id: string
  mentorId: string
  menteeId: string
  message: string | null
  goals: { goal: string; timeline?: string }[] | null
  status: "pending" | "accepted" | "declined"
  createdAt: Date
  updatedAt: Date
  mentorName?: string | null
  menteeName?: string | null
  mentorPhotoUrl?: string | null
  menteePhotoUrl?: string | null
}

export interface MentorshipSessionData {
  id: string
  requestId: string | null
  mentorId: string
  menteeId: string
  title: string | null
  notes: string | null
  scheduledAt: Date | null
  completedAt: Date | null
  feedback: any | null
  createdAt: Date
  updatedAt: Date
  mentorName?: string | null
  menteeName?: string | null
}

// ---- Mentorship Profile ----

/**
 * Create or update a mentorship profile.
 */
export async function upsertMentorshipProfile(
  userProfileId: string,
  data: {
    isMentor?: boolean
    isMentee?: boolean
    mentorTopics?: string[]
    menteeGoals?: { goal: string; timeline?: string }[]
    bio?: string
    availability?: string
  }
): Promise<MentorshipProfileData> {
  const existing = await db.mentorshipProfile.findUnique({
    where: { userProfileId },
  })

  const updateData: any = {
    isMentor: data.isMentor ?? existing?.isMentor ?? false,
    isMentee: data.isMentee ?? existing?.isMentee ?? false,
    mentorTopics: data.mentorTopics ? JSON.stringify(data.mentorTopics) : existing?.mentorTopics ?? null,
    menteeGoals: data.menteeGoals ? JSON.stringify(data.menteeGoals) : existing?.menteeGoals ?? null,
    bio: data.bio !== undefined ? data.bio : existing?.bio ?? null,
    availability: data.availability ?? existing?.availability ?? null,
  }

  let profile: any
  if (existing) {
    profile = await db.mentorshipProfile.update({
      where: { userProfileId },
      data: updateData,
    })
  } else {
    profile = await db.mentorshipProfile.create({
      data: {
        userProfileId,
        ...updateData,
      },
    })
  }

  emitEvent({
    userProfileId,
    type: "profile.update",
    resourceType: "MentorshipProfile",
    resourceId: profile.id,
    metadata: { action: "mentorship.profile.updated" },
  })

  return {
    id: profile.id,
    userProfileId: profile.userProfileId,
    isMentor: profile.isMentor,
    isMentee: profile.isMentee,
    mentorTopics: safeParseJsonArray(profile.mentorTopics),
    menteeGoals: safeParseJsonArray(profile.menteeGoals),
    bio: profile.bio,
    availability: profile.availability,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  }
}

/**
 * Get a user's mentorship profile.
 */
export async function getMentorshipProfile(
  userProfileId: string
): Promise<MentorshipProfileData | null> {
  const profile = await db.mentorshipProfile.findUnique({
    where: { userProfileId },
  })
  if (!profile) return null

  return {
    id: profile.id,
    userProfileId: profile.userProfileId,
    isMentor: profile.isMentor,
    isMentee: profile.isMentee,
    mentorTopics: safeParseJsonArray(profile.mentorTopics),
    menteeGoals: safeParseJsonArray(profile.menteeGoals),
    bio: profile.bio,
    availability: profile.availability,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  }
}

/**
 * Discover mentors by topic and/or search.
 */
export async function discoverMentors(
  topic?: string,
  search?: string,
  limit = 30
): Promise<MentorshipProfileData[]> {
  let safeLimit = Math.floor(limit)
  if (!Number.isFinite(safeLimit) || safeLimit < 1) safeLimit = 30
  if (safeLimit > 100) safeLimit = 100

  const profiles = await db.mentorshipProfile.findMany({
    where: {
      isMentor: true,
    },
    include: {
      userProfile: {
        select: {
          fullName: true,
          headline: true,
          photoUrl: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: safeLimit,
  })

  let results = profiles.map((p) => ({
    id: p.id,
    userProfileId: p.userProfileId,
    isMentor: p.isMentor,
    isMentee: p.isMentee,
    mentorTopics: safeParseJsonArray(p.mentorTopics),
    menteeGoals: safeParseJsonArray(p.menteeGoals),
    bio: p.bio,
    availability: p.availability,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    fullName: p.userProfile.fullName,
    headline: p.userProfile.headline,
    photoUrl: p.userProfile.photoUrl,
  }))

  // Filter by topic
  if (topic && topic.trim()) {
    const t = topic.trim().toLowerCase()
    results = results.filter(
      (p) =>
        p.mentorTopics?.some((mt) => mt.toLowerCase().includes(t)) ?? false
    )
  }

  // Filter by search (name or bio)
  if (search && search.trim().length >= 2) {
    const s = search.trim().toLowerCase()
    results = results.filter(
      (p) =>
        (p.fullName?.toLowerCase().includes(s) ?? false) ||
        (p.headline?.toLowerCase().includes(s) ?? false) ||
        (p.bio?.toLowerCase().includes(s) ?? false) ||
        (p.mentorTopics?.some((mt) => mt.toLowerCase().includes(s)) ?? false)
    )
  }

  return results
}

// ---- Mentorship Requests ----

/**
 * Request mentorship from a mentor.
 */
export async function requestMentorship(
  menteeId: string,
  mentorId: string,
  message?: string,
  goals?: { goal: string; timeline?: string }[]
): Promise<{ id: string }> {
  if (menteeId === mentorId) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  // Verify mentor exists and is a mentor
  const mentorProfile = await db.mentorshipProfile.findUnique({
    where: { userProfileId: mentorId },
  })
  if (!mentorProfile || !mentorProfile.isMentor) {
    throw new AuthorizationError("NOT_FOUND")
  }

  // Check for existing pending/accepted requests
  const existing = await db.mentorshipRequest.findFirst({
    where: {
      mentorId,
      menteeId,
      status: { in: ["pending", "accepted"] },
    },
  })
  if (existing) {
    throw new AuthorizationError("CONFLICT")
  }

  const request = await db.mentorshipRequest.create({
    data: {
      mentorId,
      menteeId,
      message: message?.trim() || null,
      goals: goals ? JSON.stringify(goals) : null,
    },
  })

  createNotification({
    userProfileId: mentorId,
    type: "system",
    title: "Permintaan Mentorship Baru",
    body: message?.trim() || "Seseorang ingin menjadi mentee Anda.",
    resourceType: "MentorshipRequest",
    resourceId: request.id,
  })

  emitEvent({
    userProfileId: menteeId,
    type: "profile.update",
    resourceType: "MentorshipRequest",
    resourceId: request.id,
    metadata: { action: "mentorship.requested", mentorId },
  })

  return { id: request.id }
}

/**
 * Accept a mentorship request. Only the mentor can accept.
 */
export async function acceptMentorship(
  requestId: string,
  mentorId: string
): Promise<void> {
  const request = await db.mentorshipRequest.findFirst({
    where: {
      id: requestId,
      mentorId,
      status: "pending",
    },
  })
  if (!request) {
    throw new AuthorizationError("NOT_FOUND")
  }

  await db.mentorshipRequest.update({
    where: { id: requestId },
    data: { status: "accepted" },
  })

  createNotification({
    userProfileId: request.menteeId,
    type: "system",
    title: "Permintaan Mentorship Diterima",
    body: "Mentor Anda telah menerima permintaan mentorship.",
    resourceType: "MentorshipRequest",
    resourceId: requestId,
  })

  emitEvent({
    userProfileId: mentorId,
    type: "profile.update",
    resourceType: "MentorshipRequest",
    resourceId: requestId,
    metadata: { action: "mentorship.accepted" },
  })
}

/**
 * Decline a mentorship request. Only the mentor can decline.
 */
export async function declineMentorship(
  requestId: string,
  mentorId: string
): Promise<void> {
  const request = await db.mentorshipRequest.findFirst({
    where: {
      id: requestId,
      mentorId,
      status: "pending",
    },
  })
  if (!request) {
    throw new AuthorizationError("NOT_FOUND")
  }

  await db.mentorshipRequest.update({
    where: { id: requestId },
    data: { status: "declined" },
  })

  emitEvent({
    userProfileId: mentorId,
    type: "profile.update",
    resourceType: "MentorshipRequest",
    resourceId: requestId,
    metadata: { action: "mentorship.declined" },
  })
}

/**
 * Get mentorship requests for a user (as mentor or mentee).
 */
export async function getMentorshipRequests(
  userProfileId: string,
  filter?: "incoming" | "outgoing"
): Promise<MentorshipRequestData[]> {
  const whereIncoming = { mentorId: userProfileId }
  const whereOutgoing = { menteeId: userProfileId }

  let requests: any[]
  if (filter === "incoming") {
    requests = await db.mentorshipRequest.findMany({
      where: whereIncoming,
      include: {
        mentee: {
          select: { fullName: true, photoUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  } else if (filter === "outgoing") {
    requests = await db.mentorshipRequest.findMany({
      where: whereOutgoing,
      include: {
        mentor: {
          select: { fullName: true, photoUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  } else {
    requests = await db.mentorshipRequest.findMany({
      where: {
        OR: [whereIncoming, whereOutgoing],
      },
      include: {
        mentor: {
          select: { fullName: true, photoUrl: true },
        },
        mentee: {
          select: { fullName: true, photoUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  return requests.map((r) => ({
    id: r.id,
    mentorId: r.mentorId,
    menteeId: r.menteeId,
    message: r.message,
    goals: safeParseJsonArray(r.goals),
    status: r.status as "pending" | "accepted" | "declined",
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    mentorName: r.mentor?.fullName ?? null,
    menteeName: r.mentee?.fullName ?? null,
    mentorPhotoUrl: r.mentor?.photoUrl ?? null,
    menteePhotoUrl: r.mentee?.photoUrl ?? null,
  }))
}

// ---- Mentorship Sessions ----

/**
 * Schedule a mentorship session. Only the mentor or mentee can schedule.
 */
export async function scheduleSession(
  actorId: string,
  mentorId: string,
  menteeId: string,
  title: string,
  scheduledAt: Date,
  requestId?: string,
  notes?: string
): Promise<{ id: string }> {
  // Actor must be either the mentor or mentee
  if (actorId !== mentorId && actorId !== menteeId) {
    throw new AuthorizationError("FORBIDDEN")
  }

  // Verify there's an accepted mentorship relationship
  const hasAccepted = await db.mentorshipRequest.findFirst({
    where: {
      mentorId,
      menteeId,
      status: "accepted",
    },
  })
  if (!hasAccepted) {
    throw new AuthorizationError("FORBIDDEN")
  }

  const trimmedTitle = title.trim()
  if (!trimmedTitle || trimmedTitle.length < 3) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  const session = await db.mentorshipSession.create({
    data: {
      requestId: requestId || null,
      mentorId,
      menteeId,
      title: trimmedTitle,
      notes: notes?.trim() || null,
      scheduledAt,
    },
  })

  // Notify the other party
  const notifyId = actorId === mentorId ? menteeId : mentorId
  createNotification({
    userProfileId: notifyId,
    type: "system",
    title: "Sesi Mentorship Dijadwalkan",
    body: `Sesi "${trimmedTitle}" telah dijadwalkan.`,
    resourceType: "MentorshipSession",
    resourceId: session.id,
  })

  emitEvent({
    userProfileId: actorId,
    type: "profile.update",
    resourceType: "MentorshipSession",
    resourceId: session.id,
    metadata: { action: "session.scheduled" },
  })

  return { id: session.id }
}

/**
 * Mark a session as complete with optional feedback.
 */
export async function completeSession(
  sessionId: string,
  actorId: string,
  feedback?: { rating?: number; comments?: string; goalsProgress?: string }
): Promise<void> {
  const session = await db.mentorshipSession.findUnique({
    where: { id: sessionId },
  })
  if (!session) {
    throw new AuthorizationError("NOT_FOUND")
  }

  // Only the mentor or mentee can complete
  if (actorId !== session.mentorId && actorId !== session.menteeId) {
    throw new AuthorizationError("FORBIDDEN")
  }

  if (session.completedAt) {
    throw new AuthorizationError("CONFLICT")
  }

  await db.mentorshipSession.update({
    where: { id: sessionId },
    data: {
      completedAt: new Date(),
      feedback: feedback ? JSON.stringify(feedback) : null,
    },
  })

  const notifyId = actorId === session.mentorId ? session.menteeId : session.mentorId
  createNotification({
    userProfileId: notifyId,
    type: "system",
    title: "Sesi Mentorship Selesai",
    body: `Sesi "${session.title || "Mentorship"}" telah selesai.`,
    resourceType: "MentorshipSession",
    resourceId: sessionId,
  })

  emitEvent({
    userProfileId: actorId,
    type: "profile.update",
    resourceType: "MentorshipSession",
    resourceId: sessionId,
    metadata: { action: "session.completed" },
  })
}

/**
 * Get mentorship sessions for a user (as mentor or mentee).
 */
export async function getMentorshipSessions(
  userProfileId: string
): Promise<MentorshipSessionData[]> {
  const sessions = await db.mentorshipSession.findMany({
    where: {
      OR: [
        { mentorId: userProfileId },
        { menteeId: userProfileId },
      ],
    },
    orderBy: { scheduledAt: "desc" },
  })

  // Manual lookups since MentorshipSession has no relation fields in schema
  const profileIds = new Set<string>()
  sessions.forEach((s) => {
    profileIds.add(s.mentorId)
    profileIds.add(s.menteeId)
  })

  const profiles = await db.userProfile.findMany({
    where: { id: { in: Array.from(profileIds) } },
    select: { id: true, fullName: true },
  })
  const nameMap = new Map(profiles.map((p) => [p.id, p.fullName]))

  return sessions.map((s) => ({
    id: s.id,
    requestId: s.requestId,
    mentorId: s.mentorId,
    menteeId: s.menteeId,
    title: s.title,
    notes: s.notes,
    scheduledAt: s.scheduledAt,
    completedAt: s.completedAt,
    feedback: s.feedback ? safeParseJson(s.feedback) : null,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    mentorName: nameMap.get(s.mentorId) ?? null,
    menteeName: nameMap.get(s.menteeId) ?? null,
  }))
}

// ---- Helpers ----

function safeParseJsonArray(raw: string | null): any[] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function safeParseJson(raw: string | null): any | null {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
