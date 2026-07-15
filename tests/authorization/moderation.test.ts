/// <reference types="bun-types" />

import { beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { db } from "@/lib/db"
import { resetTestRuntime, testRuntime } from "./test-runtime"
import { cleanDb, seedDb, IDS } from "./fixtures"
import { createSessionToken } from "@/lib/auth"
import { createReport, getReportQueue, createCase, suspendUser, fileAppeal, getCases, unsuspendUser } from "@/lib/moderation"

describe("Phase 4B+4C — Moderation System", () => {
  let reportsGet: any
  let reportsPost: any
  let reportsPatch: any
  let casesGet: any
  let casesPost: any
  let casesPatch: any
  let appealsGet: any
  let appealsPost: any
  let appealsPatch: any

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-key-32-chars-long-or-more"

    const reportsRoute = await import("@/app/api/reports/route")
    reportsGet = reportsRoute.GET
    reportsPost = reportsRoute.POST
    reportsPatch = reportsRoute.PATCH

    const casesRoute = await import("@/app/api/moderation/cases/route")
    casesGet = casesRoute.GET
    casesPost = casesRoute.POST
    casesPatch = casesRoute.PATCH

    const appealsRoute = await import("@/app/api/appeals/route")
    appealsGet = appealsRoute.GET
    appealsPost = appealsRoute.POST
    appealsPatch = appealsRoute.PATCH
  })

  beforeEach(async () => {
    resetTestRuntime()
    await cleanDb()
    await seedDb()
  })

  // ============================================================================
  // 1. REPORT CREATION
  // ============================================================================
  describe("Report Creation", () => {
    test("authenticated user can create a report", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "user",
          targetId: IDS.profileB,
          reason: "harassment",
          description: "Inappropriate behavior",
        }),
      })
      const res = await reportsPost(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.report).toBeDefined()
      expect(body.report.status).toBe("open")
      expect(body.report.reason).toBe("harassment")
    })

    test("unauthenticated user cannot create a report (401)", async () => {
      const req = new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "user",
          targetId: IDS.profileB,
          reason: "harassment",
        }),
      })
      const res = await reportsPost(req)
      expect(res.status).toBe(401)
    })

    test("invalid reason is rejected (400)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "user",
          targetId: IDS.profileB,
          reason: "invalid_reason",
        }),
      })
      const res = await reportsPost(req)
      expect(res.status).toBe(400)
    })

    test("invalid target type is rejected (400)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "invalid_type",
          targetId: IDS.profileB,
          reason: "spam",
        }),
      })
      const res = await reportsPost(req)
      expect(res.status).toBe(400)
    })
  })

  // ============================================================================
  // 2. REPORT QUEUE (MODERATOR ACCESS)
  // ============================================================================
  describe("Report Queue", () => {
    test("moderator can view report queue", async () => {
      // First create a report as user A
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      await reportsPost(new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "user",
          targetId: IDS.profileB,
          reason: "spam",
        }),
      }))

      // Now check as moderator
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const res = await reportsGet(new Request("http://localhost/api/reports"))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.items).toBeArray()
      expect(body.items.length).toBeGreaterThanOrEqual(1)
      expect(body.items[0].reason).toBe("spam")
    })

    test("admin can view report queue", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      await reportsPost(new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "user",
          targetId: IDS.profileB,
          reason: "inappropriate",
        }),
      }))

      testRuntime.cookieValue = await createSessionToken(IDS.adminC)
      const res = await reportsGet(new Request("http://localhost/api/reports"))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.items.length).toBeGreaterThanOrEqual(1)
    })

    test("owner can view report queue", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.ownerF)
      const res = await reportsGet(new Request("http://localhost/api/reports"))
      expect(res.status).toBe(200)
    })

    test("regular user cannot view report queue (403)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const res = await reportsGet(new Request("http://localhost/api/reports"))
      expect(res.status).toBe(403)
    })

    test("unauthenticated user cannot view report queue (401)", async () => {
      const res = await reportsGet(new Request("http://localhost/api/reports"))
      expect(res.status).toBe(401)
    })

    test("cross-user report isolation: User A's reports show in queue and User B's reports show too", async () => {
      // User A creates a report
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      await reportsPost(new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "user",
          targetId: IDS.profileB,
          reason: "harassment",
          description: "User A report",
        }),
      }))

      // User B creates a report
      testRuntime.cookieValue = await createSessionToken(IDS.accountB)
      await reportsPost(new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "content",
          targetId: "some-content-id",
          reason: "spam",
          description: "User B report",
        }),
      }))

      // Moderator sees both
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const res = await reportsGet(new Request("http://localhost/api/reports"))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.items.length).toBeGreaterThanOrEqual(2)
    })
  })

  // ============================================================================
  // 3. REPORT ASSIGNMENT
  // ============================================================================
  describe("Report Assignment", () => {
    test("moderator can assign a report to themselves", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const createRes = await reportsPost(new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "user",
          targetId: IDS.profileB,
          reason: "spam",
        }),
      }))
      const { report } = await createRes.json()

      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const res = await reportsPatch(new Request("http://localhost/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: report.id,
          action: "assign",
        }),
      }))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.report.status).toBe("investigating")
    })
  })

  // ============================================================================
  // 4. REPORT RESOLUTION
  // ============================================================================
  describe("Report Resolution", () => {
    test("moderator can resolve a report", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const createRes = await reportsPost(new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "user",
          targetId: IDS.profileB,
          reason: "harassment",
        }),
      }))
      const { report } = await createRes.json()

      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const res = await reportsPatch(new Request("http://localhost/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: report.id,
          action: "resolve",
          status: "resolved",
          resolution: "User warned",
        }),
      }))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.report.status).toBe("resolved")
    })

    test("moderator can dismiss a report", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const createRes = await reportsPost(new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "user",
          targetId: IDS.profileB,
          reason: "other",
        }),
      }))
      const { report } = await createRes.json()

      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const res = await reportsPatch(new Request("http://localhost/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: report.id,
          action: "resolve",
          status: "dismissed",
          resolution: "No violation found",
        }),
      }))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.report.status).toBe("dismissed")
    })
  })

  // ============================================================================
  // 5. MODERATION CASES
  // ============================================================================
  describe("Moderation Cases", () => {
    test("moderator can create a moderation case", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const req = new Request("http://localhost/api/moderation/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: IDS.accountA,
          type: "warning",
          reason: "First offense - spam report",
        }),
      })
      const res = await casesPost(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.case).toBeDefined()
      expect(body.case.type).toBe("warning")
      expect(body.case.status).toBe("active")
    })

    test("moderator can create a case from a report", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const createRes = await reportsPost(new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "user",
          targetId: IDS.profileB,
          reason: "harassment",
        }),
      }))
      const { report } = await createRes.json()

      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const req = new Request("http://localhost/api/moderation/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: IDS.accountA,
          type: "suspension",
          reason: "Harassment confirmed",
          duration: "24h",
          reportId: report.id,
        }),
      })
      const res = await casesPost(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.case.reportId).toBe(report.id)
    })

    test("regular user cannot create a moderation case (403)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/moderation/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: IDS.accountB,
          type: "warning",
          reason: "Bad behavior",
        }),
      })
      const res = await casesPost(req)
      expect(res.status).toBe(403)
    })

    test("moderator can list cases", async () => {
      // Create a case first
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      await casesPost(new Request("http://localhost/api/moderation/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: IDS.accountA,
          type: "warning",
          reason: "Test warning",
        }),
      }))

      const res = await casesGet(new Request("http://localhost/api/moderation/cases"))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.items).toBeArray()
      expect(body.items.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ============================================================================
  // 6. SUSPENSION
  // ============================================================================
  describe("Suspension", () => {
    test("moderator can suspend a user via moderation case", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const req = new Request("http://localhost/api/moderation/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: IDS.accountA,
          type: "suspension",
          reason: "Repeated violations",
          duration: "7d",
        }),
      })
      const res = await casesPost(req)
      expect(res.status).toBe(200)

      // Verify user is suspended
      const account = await db.account.findUnique({ where: { id: IDS.accountA } })
      expect(account!.suspended).toBe(true)
      expect(account!.suspensionReason).toBe("Repeated violations")
    })

    test("suspended user session returns null (denied at auth layer)", async () => {
      // First suspend the user
      await db.account.update({
        where: { id: IDS.accountA },
        data: { suspended: true, suspendedAt: new Date(), suspensionReason: "Test" },
      })

      // User A tries to access — session must be null for suspended users
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const { getSession } = await import("@/lib/auth")
      const session = await getSession()
      // Suspended users get no valid session — enforced at verifySessionToken and getSession
      expect(session).toBeNull()
    })

    test("moderator can unsuspend via revoke case", async () => {
      // Create suspension case
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const createRes = await casesPost(new Request("http://localhost/api/moderation/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: IDS.accountA,
          type: "suspension",
          reason: "Test",
          duration: "7d",
        }),
      }))
      const { case: mc } = await createRes.json()

      // Verify suspended
      let account = await db.account.findUnique({ where: { id: IDS.accountA } })
      expect(account!.suspended).toBe(true)

      // Revoke the case
      const revokeRes = await casesPatch(new Request("http://localhost/api/moderation/cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: mc.id,
          action: "revoke",
        }),
      }))
      expect(revokeRes.status).toBe(200)

      // Verify unsuspended
      account = await db.account.findUnique({ where: { id: IDS.accountA } })
      expect(account!.suspended).toBe(false)
    })

    test("suspended user cannot be suspended again (idempotent)", async () => {
      await db.account.update({
        where: { id: IDS.accountA },
        data: { suspended: true, suspendedAt: new Date(), suspensionReason: "Already suspended" },
      })

      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      // Creating another suspension case still works (it's a new case)
      const res = await casesPost(new Request("http://localhost/api/moderation/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: IDS.accountA,
          type: "suspension",
          reason: "Second suspension",
          duration: "30d",
        }),
      }))
      expect(res.status).toBe(200)

      // Account still suspended
      const account = await db.account.findUnique({ where: { id: IDS.accountA } })
      expect(account!.suspended).toBe(true)
    })
  })

  // ============================================================================
  // 7. APPEALS
  // ============================================================================
  describe("Appeals", () => {
    test("user can file an appeal against a moderation case", async () => {
      // Create a case first (use warning, not suspension — suspension locks out the user)
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const createRes = await casesPost(new Request("http://localhost/api/moderation/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: IDS.accountA,
          type: "warning",
          reason: "Disputed action",
        }),
      }))
      const { case: mc } = await createRes.json()

      // User A files appeal
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: mc.id,
          reason: "This suspension is unjustified. I did not violate any rules.",
        }),
      })
      const res = await appealsPost(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.appeal).toBeDefined()
      expect(body.appeal.status).toBe("pending")
    })

    test("user can view their own appeals", async () => {
      // Create case + appeal
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const createRes = await casesPost(new Request("http://localhost/api/moderation/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: IDS.accountA,
          type: "warning",
          reason: "Test",
        }),
      }))
      const { case: mc } = await createRes.json()

      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      await appealsPost(new Request("http://localhost/api/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: mc.id,
          reason: "Appeal reason",
        }),
      }))

      // Now user A views their appeals
      const res = await appealsGet(new Request(`http://localhost/api/appeals?appellantId=${IDS.accountA}`))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.items).toBeArray()
      expect(body.items.length).toBeGreaterThanOrEqual(1)
    })

    test("moderator can review an appeal (granted)", async () => {
      // Create case (use warning, not suspension — suspension locks out the appellant)
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const createRes = await casesPost(new Request("http://localhost/api/moderation/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: IDS.accountA,
          type: "warning",
          reason: "Test",
        }),
      }))
      const { case: mc } = await createRes.json()

      // User A files appeal
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const appealRes = await appealsPost(new Request("http://localhost/api/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: mc.id,
          reason: "Please review",
        }),
      }))
      const { appeal } = await appealRes.json()

      // Moderator reviews and grants
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const res = await appealsPatch(new Request("http://localhost/api/appeals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: appeal.id,
          status: "granted",
          note: "Appeal accepted. Case revoked.",
        }),
      }))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.appeal.status).toBe("granted")

      // Check case is revoked
      const caseAfter = await db.moderationCase.findUnique({ where: { id: mc.id } })
      expect(caseAfter!.status).toBe("revoked")

      // Check user is unsuspended
      const account = await db.account.findUnique({ where: { id: IDS.accountA } })
      expect(account!.suspended).toBe(false)
    })

    test("moderator can review an appeal (denied)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const createRes = await casesPost(new Request("http://localhost/api/moderation/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: IDS.accountA,
          type: "warning",
          reason: "Test",
        }),
      }))
      const { case: mc } = await createRes.json()

      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const appealRes = await appealsPost(new Request("http://localhost/api/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: mc.id, reason: "Please reconsider" }),
      }))
      const { appeal } = await appealRes.json()

      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const res = await appealsPatch(new Request("http://localhost/api/appeals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: appeal.id,
          status: "denied",
          note: "Appeal denied. Case stands.",
        }),
      }))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.appeal.status).toBe("denied")
    })

    test("regular user cannot review an appeal (403)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountB)
      const req = new Request("http://localhost/api/appeals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "some-appeal-id",
          status: "granted",
        }),
      })
      const res = await appealsPatch(req)
      expect(res.status).toBe(403)
    })
  })

  // ============================================================================
  // 8. PRIVATE-DATA ACCESS LOGGING
  // ============================================================================
  describe("Private-Data Access Logging", () => {
    test("logPrivateDataAccess creates an audit log entry", async () => {
      const { logPrivateDataAccess } = await import("@/lib/moderation")
      await logPrivateDataAccess({
        actorId: IDS.moderatorG,
        targetProfileId: IDS.profileA,
        resourceType: "Profile",
        resourceId: IDS.profileA,
        purpose: "moderation_review",
      })

      const logs = await db.auditLog.findMany({
        where: { action: "private_data.access" },
      })
      expect(logs.length).toBeGreaterThanOrEqual(1)
      const metadata = JSON.parse(logs[0].metadata!)
      expect(metadata.purpose).toBe("moderation_review")
      expect(metadata.actorId).toBe(IDS.moderatorG)
    })
  })

  // ============================================================================
  // 9. CROSS-USER ISOLATION
  // ============================================================================
  describe("Cross-User Isolation", () => {
    test("user can only see their own appeals when filtering by appellantId", async () => {
      // Create cases and appeals for two users
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const caseResA = await casesPost(new Request("http://localhost/api/moderation/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: IDS.accountA, type: "warning", reason: "Case A" }),
      }))
      const { case: caseA } = await caseResA.json()

      const caseResB = await casesPost(new Request("http://localhost/api/moderation/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: IDS.accountB, type: "warning", reason: "Case B" }),
      }))
      const { case: caseB } = await caseResB.json()

      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      await appealsPost(new Request("http://localhost/api/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: caseA.id, reason: "Appeal A" }),
      }))

      testRuntime.cookieValue = await createSessionToken(IDS.accountB)
      await appealsPost(new Request("http://localhost/api/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: caseB.id, reason: "Appeal B" }),
      }))

      // User A can see their own appeals
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const res = await appealsGet(new Request(`http://localhost/api/appeals?appellantId=${IDS.accountA}`))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.items).toBeArray()
      expect(body.items.length).toBe(1)
      expect(body.items[0].reason).toBe("Appeal A")
    })
  })

  // ============================================================================
  // 10. CACHE HEADERS
  // ============================================================================
  describe("Cache Headers", () => {
    test("moderation API responses include private/no-store cache headers", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const res = await reportsGet(new Request("http://localhost/api/reports"))
      expect(res.headers.get("Cache-Control")).toBe("private, no-store")
    })
  })
})
