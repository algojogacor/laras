import "server-only"
import { db } from "@/lib/db"
import { createNotification } from "@/lib/notifications"
import { AuthorizationError } from "@/lib/authorization"
import { revokeSessions } from "@/lib/auth"

// ============================================================================
// Moderation Service — Phase 4B+4C
// Reports, Cases, Appeals, Suspensions, Private-Data Access Logging
// ============================================================================

export type ReportTargetType = "user" | "connection" | "message" | "circle" | "mentorship" | "content"
export type ReportReason = "harassment" | "spam" | "impersonation" | "inappropriate" | "other"
export type ReportStatus = "open" | "investigating" | "resolved" | "dismissed"
export type ReportPriority = "low" | "normal" | "high" | "urgent"
export type CaseType = "warning" | "suspension" | "ban" | "restriction"
export type CaseStatus = "active" | "expired" | "revoked"
export type CaseDuration = "24h" | "7d" | "30d" | "permanent"
export type AppealStatus = "pending" | "reviewed" | "granted" | "denied"

// ============================================================================
// REPORTS
// ============================================================================

export interface CreateReportInput {
  reporterId: string // UserProfile.id
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  description?: string
  evidence?: string
}

export async function createReport(input: CreateReportInput) {
  const report = await db.report.create({
    data: {
      reporterId: input.reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      description: input.description || null,
      evidence: input.evidence || null,
      status: "open",
      priority: "normal",
    },
    select: {
      id: true,
      reporterId: true,
      targetType: true,
      targetId: true,
      reason: true,
      status: true,
      priority: true,
      createdAt: true,
    },
  })

  // Fire-and-forget: notify moderators (catch errors silently)
  notifyModerators(
    "Laporan Baru",
    `Laporan ${input.reason} untuk ${input.targetType} telah dibuat.`
  ).catch(() => {})

  return report
}

export interface GetReportQueueOptions {
  status?: ReportStatus
  priority?: ReportPriority
  assignedToId?: string
  limit?: number
  cursor?: string
}

export async function getReportQueue(opts?: GetReportQueueOptions) {
  const limit = opts?.limit ?? 20
  const where: Record<string, unknown> = {}

  if (opts?.status) where.status = opts.status
  if (opts?.priority) where.priority = opts.priority
  if (opts?.assignedToId) where.assignedToId = opts.assignedToId

  const items = await db.report.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      reporterId: true,
      reporter: { select: { id: true, fullName: true, accountId: true } },
      targetType: true,
      targetId: true,
      reason: true,
      description: true,
      evidence: true,
      status: true,
      priority: true,
      assignedToId: true,
      resolution: true,
      resolvedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const hasMore = items.length > limit
  const result = hasMore ? items.slice(0, limit) : items

  return {
    items: result.map((r) => ({
      ...r,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    nextCursor: hasMore ? result[result.length - 1].id : null,
  }
}

export async function assignReport(reportId: string, moderatorId: string) {
  const report = await db.report.update({
    where: { id: reportId },
    data: {
      assignedToId: moderatorId,
      status: "investigating",
    },
    select: { id: true, status: true, assignedToId: true },
  })
  return report
}

export async function resolveReport(
  reportId: string,
  resolution: string,
  status: "resolved" | "dismissed"
) {
  const report = await db.report.update({
    where: { id: reportId },
    data: {
      status,
      resolution,
      resolvedAt: new Date(),
    },
    select: { id: true, status: true, resolution: true, resolvedAt: true },
  })
  return { ...report, resolvedAt: report.resolvedAt?.toISOString() ?? null }
}

// ============================================================================
// MODERATION CASES
// ============================================================================

export interface CreateCaseInput {
  subjectId: string // Account.id
  type: CaseType
  reason: string
  moderatorId: string // Account.id
  moderatorRole?: string // Account.role of the acting moderator
  duration?: CaseDuration
  reportId?: string
}

export async function createCase(input: CreateCaseInput) {
  let expiresAt: Date | null = null
  if (input.duration && input.duration !== "permanent") {
    const dur: Record<string, number> = { "24h": 24, "7d": 168, "30d": 720 }
    const hours = dur[input.duration] || 0
    if (hours > 0) {
      expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000)
    }
  }

  const mc = await db.moderationCase.create({
    data: {
      reportId: input.reportId || null,
      subjectId: input.subjectId,
      type: input.type,
      reason: input.reason,
      moderatorId: input.moderatorId,
      duration: input.duration || null,
      expiresAt,
    },
    select: {
      id: true,
      reportId: true,
      subjectId: true,
      type: true,
      status: true,
      reason: true,
      moderatorId: true,
      duration: true,
      expiresAt: true,
      createdAt: true,
    },
  })

  // If suspension, verify role hierarchy and update the account
  if (input.type === "suspension") {
    // Load target account to enforce role hierarchy
    const targetAccount = await db.account.findUnique({
      where: { id: input.subjectId },
      select: { role: true },
    })
    if (!targetAccount) {
      throw new AuthorizationError("NOT_FOUND")
    }
    // Moderators cannot suspend admin or owner accounts
    if (input.moderatorRole === "moderator" && (targetAccount.role === "admin" || targetAccount.role === "owner")) {
      throw new AuthorizationError("FORBIDDEN")
    }
    // No one can suspend the platform owner
    if (targetAccount.role === "owner") {
      throw new AuthorizationError("FORBIDDEN")
    }

    await db.account.update({
      where: { id: input.subjectId },
      data: {
        suspended: true,
        suspendedAt: new Date(),
        suspensionReason: input.reason,
      },
    })

    // Revoke all active sessions for the suspended user
    await revokeSessions(input.subjectId)
  }

  return {
    ...mc,
    expiresAt: mc.expiresAt?.toISOString() ?? null,
    createdAt: mc.createdAt.toISOString(),
  }
}

export interface GetCasesOptions {
  subjectId?: string
  status?: CaseStatus
  limit?: number
  cursor?: string
}

export async function getCases(opts?: GetCasesOptions) {
  const limit = opts?.limit ?? 20
  const where: Record<string, unknown> = {}

  if (opts?.subjectId) where.subjectId = opts.subjectId
  if (opts?.status) where.status = opts.status

  const items = await db.moderationCase.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    include: {
      report: { select: { id: true, reason: true, targetType: true } },
      appeals: { select: { id: true, status: true, createdAt: true } },
    },
  })

  const hasMore = items.length > limit
  const result = hasMore ? items.slice(0, limit) : items

  return {
    items: result.map((c) => ({
      ...c,
      expiresAt: c.expiresAt?.toISOString() ?? null,
      revokedAt: c.revokedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      appeals: c.appeals.map((a) => ({
        id: a.id,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
      })),
    })),
    nextCursor: hasMore ? result[result.length - 1].id : null,
  }
}

export async function getCaseById(caseId: string) {
  const mc = await db.moderationCase.findUnique({
    where: { id: caseId },
    include: {
      report: {
        select: {
          id: true,
          reason: true,
          targetType: true,
          targetId: true,
          description: true,
          reporter: { select: { id: true, fullName: true } },
        },
      },
      appeals: {
        orderBy: { createdAt: "desc" },
        select: { id: true, reason: true, status: true, reviewNote: true, createdAt: true },
      },
    },
  })
  if (!mc) return null
  return {
    ...mc,
    expiresAt: mc.expiresAt?.toISOString() ?? null,
    revokedAt: mc.revokedAt?.toISOString() ?? null,
    createdAt: mc.createdAt.toISOString(),
    updatedAt: mc.updatedAt.toISOString(),
    appeals: mc.appeals.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  }
}

export async function revokeCase(caseId: string, moderatorId: string) {
  const existing = await db.moderationCase.findUnique({ where: { id: caseId } })
  if (!existing) throw new Error("NOT_FOUND")

  const mc = await db.moderationCase.update({
    where: { id: caseId },
    data: {
      status: "revoked",
      revokedAt: new Date(),
      revokedById: moderatorId,
    },
    select: { id: true, subjectId: true, type: true, status: true },
  })

  // If suspension, unsuspend the account
  if (existing.type === "suspension") {
    await db.account.update({
      where: { id: existing.subjectId },
      data: {
        suspended: false,
        suspendedAt: null,
        suspensionReason: null,
      },
    })
  }

  return mc
}

// ============================================================================
// APPEALS
// ============================================================================

export async function fileAppeal(caseId: string, appellantId: string, reason: string) {
  const appeal = await db.appeal.create({
    data: {
      caseId,
      appellantId,
      reason,
      status: "pending",
    },
    select: {
      id: true,
      caseId: true,
      appellantId: true,
      reason: true,
      status: true,
      createdAt: true,
    },
  })
  return { ...appeal, createdAt: appeal.createdAt.toISOString() }
}

export interface GetAppealsOptions {
  appellantId?: string
  status?: AppealStatus
  limit?: number
  cursor?: string
}

export async function getAppeals(opts?: GetAppealsOptions) {
  const limit = opts?.limit ?? 20
  const where: Record<string, unknown> = {}

  if (opts?.appellantId) where.appellantId = opts.appellantId
  if (opts?.status) where.status = opts.status

  const items = await db.appeal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    include: {
      moderationCase: {
        select: { id: true, type: true, reason: true, subjectId: true, status: true },
      },
    },
  })

  const hasMore = items.length > limit
  const result = hasMore ? items.slice(0, limit) : items

  return {
    items: result.map((a) => ({
      ...a,
      reviewedAt: a.reviewedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
    nextCursor: hasMore ? result[result.length - 1].id : null,
  }
}

export async function reviewAppeal(
  appealId: string,
  reviewerId: string,
  status: "granted" | "denied",
  note?: string
) {
  const appeal = await db.appeal.update({
    where: { id: appealId },
    data: {
      status,
      reviewerId,
      reviewNote: note || null,
      reviewedAt: new Date(),
    },
    select: {
      id: true,
      caseId: true,
      status: true,
      reviewNote: true,
      reviewedAt: true,
    },
  })

  // If granted, revoke the associated case
  if (status === "granted") {
    try {
      await revokeCase(appeal.caseId, reviewerId)
    } catch {
      // If case already revoked, ignore
    }
  }

  return { ...appeal, reviewedAt: appeal.reviewedAt?.toISOString() ?? null }
}

// ============================================================================
// SUSPENSION
// ============================================================================

export async function suspendUser(accountId: string, reason: string, moderatorId: string) {
  const account = await db.account.update({
    where: { id: accountId },
    data: {
      suspended: true,
      suspendedAt: new Date(),
      suspensionReason: reason,
    },
    select: { id: true, email: true, suspended: true, suspendedAt: true, suspensionReason: true },
  })

  // Revoke all active sessions for the suspended user
  await revokeSessions(accountId)

  return {
    ...account,
    suspendedAt: account.suspendedAt?.toISOString() ?? null,
  }
}

export async function unsuspendUser(accountId: string) {
  const account = await db.account.update({
    where: { id: accountId },
    data: {
      suspended: false,
      suspendedAt: null,
      suspensionReason: null,
    },
    select: { id: true, email: true, suspended: true },
  })
  return account
}

// ============================================================================
// PRIVATE-DATA ACCESS LOGGING (Audit Trail)
// ============================================================================

export interface LogPrivateDataAccessInput {
  actorId: string // Account.id who accessed
  targetProfileId: string // UserProfile.id being accessed
  resourceType: string // e.g., "Profile", "Document", "Connection"
  resourceId: string // ID of the accessed resource
  purpose: string // e.g., "moderation_review", "admin_search"
}

export async function logPrivateDataAccess(input: LogPrivateDataAccessInput) {
  // We log to the existing AuditLog model for consistency
  // Using the actor's profileId if available, or using a system marker
  try {
    const actorProfile = await db.userProfile.findUnique({
      where: { accountId: input.actorId },
      select: { id: true },
    })

    await db.auditLog.create({
      data: {
        userProfileId: actorProfile?.id || "system",
        action: "private_data.access",
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        metadata: JSON.stringify({
          actorId: input.actorId,
          targetProfileId: input.targetProfileId,
          purpose: input.purpose,
          accessedAt: new Date().toISOString(),
        }),
      },
    })
  } catch {
    console.error("[moderation] Failed to log private data access")
  }
}

// ============================================================================
// HELPERS
// ============================================================================

async function notifyModerators(title: string, body: string) {
  try {
    const moderators = await db.account.findMany({
      where: {
        role: { in: ["moderator", "admin", "owner"] },
      },
      select: { id: true },
    })

    // Find profiles for each moderator and send notifications
    for (const mod of moderators) {
      const profile = await db.userProfile.findUnique({
        where: { accountId: mod.id },
        select: { id: true },
      })
      if (profile) {
        await createNotification({
          userProfileId: profile.id,
          type: "system",
          title,
          body,
          resourceType: "Report",
        })
      }
    }
  } catch {
    // Fire-and-forget
  }
}

export function isModeratorOrAbove(role: string | null | undefined): boolean {
  return role === "moderator" || role === "admin" || role === "owner"
}
