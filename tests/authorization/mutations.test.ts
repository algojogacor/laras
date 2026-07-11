/// <reference types="bun-types" />

import { beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { db } from "@/lib/db"
import { resetTestRuntime, testRuntime } from "./test-runtime"

// Import route handlers dynamically
let appPatch: any
let appDelete: any
let docDelete: any
let docRevisePost: any
let setDelete: any
let setFeedbackPost: any
let engSubmitPost: any
let certPost: any
let connPatch: any

import { cleanDb, seedDb, IDS } from "./fixtures"
import { createSessionToken } from "@/lib/auth"

function getNonexistentId(validId: string): string {
  if (!validId || validId.length < 2) return "cyyyyyyyyyyyyyyyyyyyyyyyy"
  const char = validId[1]
  const newChar = char === "z" ? "y" : String.fromCharCode(char.charCodeAt(0) + 1)
  return "c" + newChar + validId.slice(2)
}

describe("Wave B Mutations Authorization Tests", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-key-32-chars-long-or-more"

    // Import the API routes dynamically
    const appRoute = await import("@/app/api/applications/[id]/route")
    appPatch = appRoute.PATCH
    appDelete = appRoute.DELETE

    const docRoute = await import("@/app/api/documents/[id]/route")
    docDelete = docRoute.DELETE

    const reviseRoute = await import("@/app/api/documents/[id]/revise/route")
    docRevisePost = reviseRoute.POST

    const setRoute = await import("@/app/api/interview-sets/[id]/route")
    setDelete = setRoute.DELETE

    const feedbackRoute = await import("@/app/api/interview-sets/[id]/feedback/route")
    setFeedbackPost = feedbackRoute.POST

    const submitRoute = await import("@/app/api/english/submit/route")
    engSubmitPost = submitRoute.POST

    const certsRoute = await import("@/app/api/english/certificates/route")
    certPost = certsRoute.POST

    const connRoute = await import("@/app/api/connections/[id]/route")
    connPatch = connRoute.PATCH
  })

  beforeEach(async () => {
    resetTestRuntime()
    await cleanDb()
    await seedDb()
  })

  // Helper to build Next.js API params
  const makeParams = (id: string) => Promise.resolve({ id })

  // ============================================================================
  // 1. APPLICATIONS [id]
  // ============================================================================
  describe("PATCH /api/applications/[id]", () => {
    test("User A can update their own application", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/applications/" + IDS.applicationA, {
        method: "PATCH",
        body: JSON.stringify({ position: "Updated Dev" }),
      })
      const res = await appPatch(req, { params: makeParams(IDS.applicationA) })
      expect(res.status).toBe(200)

      const dbApp = await db.application.findUnique({ where: { id: IDS.applicationA } })
      expect(dbApp?.position).toBe("Updated Dev")
    })

    test("User A cannot update User B's application (returns 404)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/applications/" + IDS.applicationB, {
        method: "PATCH",
        body: JSON.stringify({ position: "Hacked Dev" }),
      })
      const res = await appPatch(req, { params: makeParams(IDS.applicationB) })
      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ error: "not-found" })

      // Verify DB remains unchanged
      const dbApp = await db.application.findUnique({ where: { id: IDS.applicationB } })
      expect(dbApp?.position).toBe("Software Engineer B")
    })

    test("Admin role cannot update User B's application (returns 404)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)
      const req = new Request("http://localhost/api/applications/" + IDS.applicationB, {
        method: "PATCH",
        body: JSON.stringify({ position: "Admin Dev" }),
      })
      const res = await appPatch(req, { params: makeParams(IDS.applicationB) })
      expect(res.status).toBe(404)
    })

    test("Anonymous returns 401", async () => {
      const req = new Request("http://localhost/api/applications/" + IDS.applicationA, {
        method: "PATCH",
        body: JSON.stringify({ position: "Anon Dev" }),
      })
      const res = await appPatch(req, { params: makeParams(IDS.applicationA) })
      expect(res.status).toBe(401)
    })

    test("Malformed ID returns 400", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/applications/invalid-id", {
        method: "PATCH",
        body: JSON.stringify({ position: "Invalid Dev" }),
      })
      const res = await appPatch(req, { params: makeParams("invalid-id") })
      expect(res.status).toBe(400)
    })
  })

  describe("DELETE /api/applications/[id]", () => {
    test("User A can delete their own application", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/applications/" + IDS.applicationA, { method: "DELETE" })
      const res = await appDelete(req, { params: makeParams(IDS.applicationA) })
      expect(res.status).toBe(200)

      const dbApp = await db.application.findUnique({ where: { id: IDS.applicationA } })
      expect(dbApp).toBeNull()
    })

    test("User A cannot delete User B's application (returns 404)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/applications/" + IDS.applicationB, { method: "DELETE" })
      const res = await appDelete(req, { params: makeParams(IDS.applicationB) })
      expect(res.status).toBe(404)

      const dbApp = await db.application.findUnique({ where: { id: IDS.applicationB } })
      expect(dbApp).not.toBeNull()
    })
  })

  // ============================================================================
  // 2. DOCUMENTS [id]
  // ============================================================================
  describe("DELETE /api/documents/[id]", () => {
    test("User A can delete their own document", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/documents/" + IDS.documentA, { method: "DELETE" })
      const res = await docDelete(req, { params: makeParams(IDS.documentA) })
      expect(res.status).toBe(200)

      const dbDoc = await db.document.findUnique({ where: { id: IDS.documentA } })
      expect(dbDoc).toBeNull()
    })

    test("User A cannot delete User B's document (returns 404)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/documents/" + IDS.documentB, { method: "DELETE" })
      const res = await docDelete(req, { params: makeParams(IDS.documentB) })
      expect(res.status).toBe(404)

      const dbDoc = await db.document.findUnique({ where: { id: IDS.documentB } })
      expect(dbDoc).not.toBeNull()
    })
  })

  // ============================================================================
  // 3. DOCUMENTS REVISE
  // ============================================================================
  describe("POST /api/documents/[id]/revise", () => {
    test("User A can revise their own document (creates new version, revisions)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/documents/" + IDS.documentA + "/revise", {
        method: "POST",
        body: JSON.stringify({ instruction: "make it sound more technical" }),
      })
      const res = await docRevisePost(req, { params: makeParams(IDS.documentA) })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.versionNumber).toBe(2) // next version number is 2

      const doc = await db.document.findUnique({ where: { id: IDS.documentA } })
      expect(doc?.version).toBe(2)

      const revision = await db.revisionRequest.findFirst({
        where: { documentId: IDS.documentA, instruction: "make it sound more technical" },
      })
      expect(revision).not.toBeNull()
      expect(revision?.status).toBe("completed")
    })

    test("User A cannot revise User B's document (returns 404)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/documents/" + IDS.documentB + "/revise", {
        method: "POST",
        body: JSON.stringify({ instruction: "hack document" }),
      })
      const res = await docRevisePost(req, { params: makeParams(IDS.documentB) })
      expect(res.status).toBe(404)
    })

    test("parallel revisions advance one logical version without partial rows", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)

      let arrivals = 0
      let releaseBarrier!: () => void
      const barrier = new Promise<void>((resolve) => {
        releaseBarrier = resolve
      })
      testRuntime.zaiCompletionsHook = async () => {
        arrivals += 1
        if (arrivals === 2) releaseBarrier()
        await barrier
      }

      const makeRevisionRequest = (instruction: string) =>
        new Request(`http://localhost/api/documents/${IDS.documentA}/revise`, {
          method: "POST",
          body: JSON.stringify({ instruction }),
        })

      const results = await Promise.allSettled([
        docRevisePost(makeRevisionRequest("parallel edit alpha"), {
          params: makeParams(IDS.documentA),
        }),
        docRevisePost(makeRevisionRequest("parallel edit beta"), {
          params: makeParams(IDS.documentA),
        }),
      ])

      expect(arrivals).toBe(2)
      expect(results.map((result) => result.status)).toEqual(["fulfilled", "fulfilled"])

      const responses = results.map((result) => {
        if (result.status !== "fulfilled") throw result.reason
        return result.value as Response
      })
      expect(responses.map((response) => response.status).sort()).toEqual([200, 409])

      const finalDocument = await db.document.findUnique({
        where: { id: IDS.documentA },
      })
      const versions = await db.documentVersion.findMany({
        where: { documentId: IDS.documentA },
        orderBy: { versionNumber: "asc" },
      })
      const revisions = await db.revisionRequest.findMany({
        where: { documentId: IDS.documentA },
        orderBy: { createdAt: "asc" },
      })

      expect(finalDocument?.version).toBe(2)
      expect(versions.map((version) => version.versionNumber)).toEqual([1, 2])
      expect(new Set(versions.map((version) => version.versionNumber)).size).toBe(2)
      expect(revisions).toHaveLength(1)
      expect(revisions[0]?.status).toBe("completed")
      expect(revisions[0]?.resultVersionId).toBe(versions[1]?.id)
      expect(["parallel edit alpha", "parallel edit beta"]).toContain(
        revisions[0]?.instruction,
      )
      expect(versions[1]?.revisionInstruction).toBe(revisions[0]?.instruction)
      expect(finalDocument?.content).toBe(versions[1]?.content)
    })

    test("Concurrent edits return 409 conflict", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)

      // Set hook to update database version concurrently during LLM execution
      testRuntime.zaiCompletionsHook = async () => {
        await db.document.update({
          where: { id: IDS.documentA },
          data: { version: 99 },
        })
      }

      const req2 = new Request("http://localhost/api/documents/" + IDS.documentA + "/revise", {
        method: "POST",
        body: JSON.stringify({ instruction: "edit 2" }),
      })
      const res2 = await docRevisePost(req2, { params: makeParams(IDS.documentA) })
      expect(res2.status).toBe(409)
      expect(await res2.json()).toEqual({ error: "conflict" })
    })
  })

  // ============================================================================
  // 4. INTERVIEW SETS
  // ============================================================================
  describe("DELETE /api/interview-sets/[id]", () => {
    test("User A can delete their own interview set", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/interview-sets/" + IDS.setA, { method: "DELETE" })
      const res = await setDelete(req, { params: makeParams(IDS.setA) })
      expect(res.status).toBe(200)

      const dbSet = await db.interviewSet.findUnique({ where: { id: IDS.setA } })
      expect(dbSet).toBeNull()
    })

    test("User A cannot delete User B's interview set (returns 404)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/interview-sets/" + IDS.setB, { method: "DELETE" })
      const res = await setDelete(req, { params: makeParams(IDS.setB) })
      expect(res.status).toBe(404)
    })
  })

  describe("POST /api/interview-sets/[id]/feedback", () => {
    test("User A can submit answer and get feedback for their own question", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/interview-sets/" + IDS.setA + "/feedback", {
        method: "POST",
        body: JSON.stringify({ questionId: IDS.questionA, answer: "My starter answer" }),
      })
      const res = await setFeedbackPost(req, { params: makeParams(IDS.setA) })
      expect(res.status).toBe(200)

      const dbQ = await db.interviewQuestion.findUnique({ where: { id: IDS.questionA } })
      expect(dbQ?.userAnswer).toBe("My starter answer")
      expect(dbQ?.feedback).not.toBeNull()
    })

    test("User A cannot submit feedback for Set A + Question B (mismatched child, returns 404)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/interview-sets/" + IDS.setA + "/feedback", {
        method: "POST",
        body: JSON.stringify({ questionId: IDS.questionB, answer: "Hacked answer" }),
      })
      const res = await setFeedbackPost(req, { params: makeParams(IDS.setA) })
      expect(res.status).toBe(404)
    })

    test("User A cannot submit feedback for Set B + Question A (foreign parent, returns 404)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/interview-sets/" + IDS.setB + "/feedback", {
        method: "POST",
        body: JSON.stringify({ questionId: IDS.questionA, answer: "Hacked answer" }),
      })
      const res = await setFeedbackPost(req, { params: makeParams(IDS.setB) })
      expect(res.status).toBe(404)
    })
  })

  // ============================================================================
  // 5. ENGLISH & CERTIFICATES
  // ============================================================================
  describe("POST /api/english/submit", () => {
    test("User A can submit answers for their own English session", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/english/submit", {
        method: "POST",
        body: JSON.stringify({ sessionId: IDS.sessionA, answers: { "q1": 1 } }),
      })
      const res = await engSubmitPost(req)
      expect(res.status).toBe(200)

      const dbSess = await db.englishSession.findUnique({ where: { id: IDS.sessionA } })
      expect(dbSess?.userAnswers).toBe(JSON.stringify({ "q1": 1 }))
    })

    test("User A cannot submit answers for User B's English session (returns 404)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/english/submit", {
        method: "POST",
        body: JSON.stringify({ sessionId: IDS.sessionB, answers: { "q1": 1 } }),
      })
      const res = await engSubmitPost(req)
      expect(res.status).toBe(404)
    })
  })

  describe("POST /api/english/certificates", () => {
    beforeEach(async () => {
      // Clear certificates to ensure no pre-existing cert for sessionA
      await db.englishCertificate.deleteMany()
    })

    test("User A can create certificate for completed scored session", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      // First score the session
      await db.englishSession.update({
        where: { id: IDS.sessionA },
        data: { score: 80, questions: JSON.stringify([{ id: "q1", answer: 1 }]) },
      })

      const req = new Request("http://localhost/api/english/certificates", {
        method: "POST",
        body: JSON.stringify({ sessionId: IDS.sessionA }),
      })
      const res = await certPost(req)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.certificate.sessionId).toBe(IDS.sessionA)
    })

    test("User A cannot create certificate for non-scored session (returns 400)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/english/certificates", {
        method: "POST",
        body: JSON.stringify({ sessionId: IDS.sessionA }),
      })
      const res = await certPost(req)
      expect(res.status).toBe(400)
    })

    test("User A cannot create duplicate certificates for the same session (returns 409)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      await db.englishSession.update({
        where: { id: IDS.sessionA },
        data: { score: 80, questions: JSON.stringify([{ id: "q1", answer: 1 }]) },
      })

      // Create first certificate
      const req1 = new Request("http://localhost/api/english/certificates", {
        method: "POST",
        body: JSON.stringify({ sessionId: IDS.sessionA }),
      })
      const res1 = await certPost(req1)
      expect(res1.status).toBe(200)

      // Try creating second certificate
      const req2 = new Request("http://localhost/api/english/certificates", {
        method: "POST",
        body: JSON.stringify({ sessionId: IDS.sessionA }),
      })
      const res2 = await certPost(req2)
      expect(res2.status).toBe(409)
    })

    test("User A cannot mint certificate from User B's session (returns 404)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      await db.englishSession.update({
        where: { id: IDS.sessionB },
        data: { score: 80 },
      })

      const req = new Request("http://localhost/api/english/certificates", {
        method: "POST",
        body: JSON.stringify({ sessionId: IDS.sessionB }),
      })
      const res = await certPost(req)
      expect(res.status).toBe(404)
    })
  })

  // ============================================================================
  // 6. CONNECTIONS STATUS TRANSITION
  // ============================================================================
  describe("PATCH /api/connections/[id]", () => {
    let pendingConnId: string

    beforeEach(async () => {
      // Seed a pending connection request from B to A (A is addressee)
      const conn = await db.connection.create({
        data: {
          requesterId: IDS.profileB,
          addresseeId: IDS.profileA,
          status: "pending",
        },
      })
      pendingConnId = conn.id
    })

    test("Pending addressee (User A) can accept request", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/connections/" + pendingConnId, {
        method: "PATCH",
        body: JSON.stringify({ action: "accept" }),
      })
      const res = await connPatch(req, { params: makeParams(pendingConnId) })
      expect(res.status).toBe(200)

      const dbConn = await db.connection.findUnique({ where: { id: pendingConnId } })
      expect(dbConn?.status).toBe("accepted")
    })

    test("Pending requester (User B) cannot accept request (returns 404)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountB)
      const req = new Request("http://localhost/api/connections/" + pendingConnId, {
        method: "PATCH",
        body: JSON.stringify({ action: "accept" }),
      })
      const res = await connPatch(req, { params: makeParams(pendingConnId) })
      expect(res.status).toBe(404)

      const dbConn = await db.connection.findUnique({ where: { id: pendingConnId } })
      expect(dbConn?.status).toBe("pending")
    })

    test("Accepting an already accepted connection returns 409", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)

      // Accept it first
      const req1 = new Request("http://localhost/api/connections/" + pendingConnId, {
        method: "PATCH",
        body: JSON.stringify({ action: "accept" }),
      })
      const res1 = await connPatch(req1, { params: makeParams(pendingConnId) })
      expect(res1.status).toBe(200)

      // Try to accept again
      const req2 = new Request("http://localhost/api/connections/" + pendingConnId, {
        method: "PATCH",
        body: JSON.stringify({ action: "accept" }),
      })
      const res2 = await connPatch(req2, { params: makeParams(pendingConnId) })
      expect(res2.status).toBe(409)
      expect(await res2.json()).toEqual({ error: "conflict" })
    })

    test("Accepting a nonexistent connection ID returns 404", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const nonexistentId = getNonexistentId(pendingConnId)
      const req = new Request("http://localhost/api/connections/" + nonexistentId, {
        method: "PATCH",
        body: JSON.stringify({ action: "accept" }),
      })
      const res = await connPatch(req, { params: makeParams(nonexistentId) })
      expect(res.status).toBe(404)
    })
  })
})
