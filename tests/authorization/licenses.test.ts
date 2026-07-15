/// <reference types="bun-types" />

import { beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { db } from "@/lib/db"
import { resetTestRuntime, testRuntime } from "./test-runtime"
import { cleanDb, seedDb, IDS } from "./fixtures"
import { createSessionToken } from "@/lib/auth"

// Import route handlers dynamically
let adminCodesGet: any
let adminCodesPost: any
let adminCodesPatch: any
let licenseRedeemPost: any
let healthGet: any
let resetRequestPost: any
let resetConfirmPost: any

describe("Phase 5A — License Codes & Security Hardening", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-key-32-chars-long-or-more"

    const adminCodesRoute = await import("@/app/api/admin/codes/route")
    adminCodesGet = adminCodesRoute.GET
    adminCodesPost = adminCodesRoute.POST
    adminCodesPatch = adminCodesRoute.PATCH

    const redeemRoute = await import("@/app/api/licenses/redeem/route")
    licenseRedeemPost = redeemRoute.POST

    const healthRoute = await import("@/app/api/health/route")
    healthGet = healthRoute.GET

    const resetReqRoute = await import("@/app/api/auth/reset/request/route")
    resetRequestPost = resetReqRoute.POST

    const resetConfRoute = await import("@/app/api/auth/reset/confirm/route")
    resetConfirmPost = resetConfRoute.POST
  })

  beforeEach(async () => {
    resetTestRuntime()
    await cleanDb()
    await seedDb()
  })

  // ============================================================================
  // LICENSE CODE ADMIN API
  // ============================================================================
  describe("License Code Admin API", () => {
    test("Admin can generate codes", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)
      const req = new Request("http://localhost/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro", count: 3 }),
      })
      const res = await adminCodesPost(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.generated).toBe(3)
      expect(body.codes).toBeArray()
      expect(body.codes.length).toBe(3)
      // Each code should have id, code, plan etc.
      expect(body.codes[0]).toHaveProperty("code")
      expect(body.codes[0].code.length).toBe(16)
      expect(body.codes[0].plan).toBe("pro")
    })

    test("Owner can generate codes", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.ownerF)
      const req = new Request("http://localhost/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro", count: 1 }),
      })
      const res = await adminCodesPost(req)
      expect(res.status).toBe(200)
    })

    test("Non-admin cannot generate codes (403)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro", count: 1 }),
      })
      const res = await adminCodesPost(req)
      expect(res.status).toBe(403)
    })

    test("Admin can list codes", async () => {
      // First generate a code
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)
      await adminCodesPost(
        new Request("http://localhost/api/admin/codes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "pro", count: 2 }),
        })
      )

      testRuntime.cookieValue = await createSessionToken(IDS.adminC)
      const res = await adminCodesGet()
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.codes).toBeArray()
      expect(body.codes.length).toBe(2)
      // Listing should NOT expose full codes
      expect(body.codes[0].codePrefix).toBeDefined()
      expect(body.codes[0]).not.toHaveProperty("code")
    })

    test("Admin can deactivate a code", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)
      const genReq = new Request("http://localhost/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro", count: 1 }),
      })
      const genRes = await adminCodesPost(genReq)
      const genBody = await genRes.json()
      const codeId = genBody.codes[0].id

      const patchReq = new Request("http://localhost/api/admin/codes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeId }),
      })
      const res = await adminCodesPatch(patchReq)
      expect(res.status).toBe(200)

      // Verify it's deactivated in DB
      const record = await db.licenseCode.findUnique({ where: { id: codeId } })
      expect(record!.isActive).toBe(false)
    })
  })

  // ============================================================================
  // LICENSE CODE REDEMPTION
  // ============================================================================
  describe("License Code Redemption", () => {
    async function createTestCode(plan: string = "pro", opts?: { expiresAt?: Date; maxRedemptions?: number }) {
      const record = await db.licenseCode.create({
        data: {
          code: "TESTCODE12345678",
          plan,
          maxRedemptions: opts?.maxRedemptions ?? 1,
          createdById: IDS.adminC,
          expiresAt: opts?.expiresAt ?? null,
        },
      })
      return record
    }

    test("User can redeem a valid code", async () => {
      await createTestCode("pro")

      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/licenses/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "TESTCODE12345678" }),
      })
      const res = await licenseRedeemPost(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.license.plan).toBe("pro")

      // Verify a License row was created
      const licenses = await db.license.findMany({
        where: { userProfileId: IDS.profileA },
      })
      expect(licenses.length).toBe(1)
      expect(licenses[0].plan).toBe("pro")
      expect(licenses[0].status).toBe("active")
    })

    test("Redeeming invalid code returns 404", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/licenses/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "NONEXISTENTCODE1" }),
      })
      const res = await licenseRedeemPost(req)
      expect(res.status).toBe(404)
    })

    test("Redeeming fully-used code returns 409", async () => {
      const code = await db.licenseCode.create({
        data: {
          code: "USEDUPCODE123456",
          plan: "pro",
          maxRedemptions: 1,
          currentRedemptions: 1,
          createdById: IDS.adminC,
        },
      })

      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/licenses/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "USEDUPCODE123456" }),
      })
      const res = await licenseRedeemPost(req)
      expect(res.status).toBe(409)
    })

    test("Redeeming expired code returns 410", async () => {
      const pastDate = new Date(Date.now() - 86400000) // yesterday
      await db.licenseCode.create({
        data: {
          code: "EXPIREDCODE12345",
          plan: "pro",
          maxRedemptions: 1,
          createdById: IDS.adminC,
          expiresAt: pastDate,
        },
      })

      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/licenses/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "EXPIREDCODE12345" }),
      })
      const res = await licenseRedeemPost(req)
      expect(res.status).toBe(410)
    })

    test("Duplicate redemption returns 409", async () => {
      await createTestCode("pro")

      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req1 = new Request("http://localhost/api/licenses/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "TESTCODE12345678" }),
      })
      const res1 = await licenseRedeemPost(req1)
      expect(res1.status).toBe(200)

      // Try again — should reject duplicate
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req2 = new Request("http://localhost/api/licenses/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "TESTCODE12345678" }),
      })
      const res2 = await licenseRedeemPost(req2)
      expect(res2.status).toBe(409)
    })

    test("Redeeming requires authentication", async () => {
      await createTestCode("pro")

      const req = new Request("http://localhost/api/licenses/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "TESTCODE12345678" }),
      })
      const res = await licenseRedeemPost(req)
      expect(res.status).toBe(401)
    })

    test("Codes are case-insensitive", async () => {
      await createTestCode("pro")

      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/licenses/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "testcode12345678" }),
      })
      const res = await licenseRedeemPost(req)
      expect(res.status).toBe(200)
    })

    test("Redemption creates audit log entry", async () => {
      await createTestCode("pro")

      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/licenses/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "TESTCODE12345678" }),
      })
      await licenseRedeemPost(req)

      const logs = await db.auditLog.findMany({
        where: { userProfileId: IDS.profileA, action: "license.redeem" },
      })
      expect(logs.length).toBe(1)
      expect(logs[0].resourceType).toBe("LicenseCode")
    })

    test("Redemption increments currentRedemptions atomically", async () => {
      const codeRecord = await createTestCode("pro")

      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/licenses/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "TESTCODE12345678" }),
      })
      await licenseRedeemPost(req)

      const updated = await db.licenseCode.findUnique({ where: { id: codeRecord.id } })
      expect(updated!.currentRedemptions).toBe(1)
    })
  })

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================
  describe("Health Check Endpoint", () => {
    test("GET /api/health returns 200 with DB connected", async () => {
      const res = await healthGet()
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe("healthy")
      expect(body.db).toBe("connected")
      expect(body.timestamp).toBeString()
    })
  })

  // ============================================================================
  // PASSWORD RESET FLOW
  // ============================================================================
  describe("Password Reset Flow", () => {
    test("POST /api/auth/reset/request always returns 200 (anti-enumeration)", async () => {
      // Valid email
      const req1 = new Request("http://localhost/api/auth/reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user-a@example.com" }),
      })
      const res1 = await resetRequestPost(req1)
      expect(res1.status).toBe(200)

      // Non-existent email still returns 200
      const req2 = new Request("http://localhost/api/auth/reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nobody@example.com" }),
      })
      const res2 = await resetRequestPost(req2)
      expect(res2.status).toBe(200)

      // Malformed body still returns 200
      const req3 = new Request("http://localhost/api/auth/reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      })
      const res3 = await resetRequestPost(req3)
      expect(res3.status).toBe(200)
    })

    test("POST /api/auth/reset/confirm with invalid token returns 400", async () => {
      const req = new Request("http://localhost/api/auth/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "invalid-token-that-doesnt-exist", password: "newpassword123" }),
      })
      const res = await resetConfirmPost(req)
      expect(res.status).toBe(400)
    })

    test("POST /api/auth/reset/confirm with weak password returns 400", async () => {
      const req = new Request("http://localhost/api/auth/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "sometoken", password: "short" }),
      })
      const res = await resetConfirmPost(req)
      expect(res.status).toBe(400)
    })
  })
})
