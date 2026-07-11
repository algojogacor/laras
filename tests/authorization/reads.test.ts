/// <reference types="bun-types" />

import { beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { db } from "@/lib/db"
import { resetTestRuntime, testRuntime } from "./test-runtime"

// Import route handlers dynamically
let docsGet: any
let appsGet: any
let setsGet: any
let certsGet: any
let certDetailGet: any
let bioExportGet: any
let essayExportGet: any
let cvExportGet: any
let clExportGet: any
let deckExportGet: any
let profileExportGet: any
let connsGet: any

import { cleanDb, seedDb, IDS, CANARIES } from "./fixtures"
import { createSessionToken } from "@/lib/auth"

describe("Wave C Reads and Exports Authorization Tests", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-key-32-chars-long-or-more"

    // Import routes dynamically
    const docsRoute = await import("@/app/api/documents/route")
    docsGet = docsRoute.GET

    const appsRoute = await import("@/app/api/applications/route")
    appsGet = appsRoute.GET

    const setsRoute = await import("@/app/api/interview-sets/route")
    setsGet = setsRoute.GET

    const certsRoute = await import("@/app/api/english/certificates/route")
    certsGet = certsRoute.GET

    const certDetailRoute = await import("@/app/api/english/certificate/[id]/route")
    certDetailGet = certDetailRoute.GET

    const bioExportRoute = await import("@/app/api/documents/bio/[id]/export/route")
    bioExportGet = bioExportRoute.GET

    const essayExportRoute = await import("@/app/api/documents/essay/[id]/export/route")
    essayExportGet = essayExportRoute.GET

    const cvExportRoute = await import("@/app/api/documents/cv-ats/[id]/export/route")
    cvExportGet = cvExportRoute.GET

    const clExportRoute = await import("@/app/api/documents/cover-letter/[id]/export/route")
    clExportGet = clExportRoute.GET

    const deckExportRoute = await import("@/app/api/documents/deck/export/route")
    deckExportGet = deckExportRoute.GET

    const profileExportRoute = await import("@/app/api/export/route")
    profileExportGet = profileExportRoute.GET

    const connsRoute = await import("@/app/api/connections/route")
    connsGet = connsRoute.GET
  })

  beforeEach(async () => {
    resetTestRuntime()
    await cleanDb()
    await seedDb()
  })

  const makeParams = (id: string) => Promise.resolve({ id })

  // ============================================================================
  // 1. DOCUMENTS LIST
  // ============================================================================
  describe("GET /api/documents", () => {
    test("User A can list their own documents", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const res = await docsGet()
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.documents).toBeArray()
      expect(body.documents.some((d: any) => d.id === IDS.documentA)).toBe(true)
      expect(body.documents.some((d: any) => d.id === IDS.documentB)).toBe(false)
    })
  })

  // ============================================================================
  // 2. APPLICATIONS LIST
  // ============================================================================
  describe("GET /api/applications", () => {
    test("User A can list their own applications", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const res = await appsGet()
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.applications).toBeArray()
      expect(body.applications.some((a: any) => a.id === IDS.applicationA)).toBe(true)
      expect(body.applications.some((a: any) => a.id === IDS.applicationB)).toBe(false)
    })
  })

  // ============================================================================
  // 3. INTERVIEW SETS LIST
  // ============================================================================
  describe("GET /api/interview-sets", () => {
    test("User A can list their own interview sets", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const res = await setsGet()
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.sets).toBeArray()
      expect(body.sets.some((s: any) => s.id === IDS.setA)).toBe(true)
      expect(body.sets.some((s: any) => s.id === IDS.setB)).toBe(false)
    })
  })

  // ============================================================================
  // 4. ENGLISH CERTIFICATES LIST / DETAIL
  // ============================================================================
  describe("GET /api/english/certificates and [id]", () => {
    test("User A can list their own certificates", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const res = await certsGet()
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.certificates).toBeArray()
      expect(body.certificates.some((c: any) => c.id === IDS.certA)).toBe(true)
      expect(body.certificates.some((c: any) => c.id === IDS.certB)).toBe(false)
    })

    test("User A can read their own certificate detail with private cache headers", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/english/certificate/" + IDS.certA)
      const res = await certDetailGet(req, { params: makeParams(IDS.certA) })
      expect(res.status).toBe(200)
      expect(res.headers.get("Cache-Control")).toBe("private, no-store")
      const body = await res.json()
      expect(body.certificate.id).toBe(IDS.certA)
    })

    test("User A cannot read User B's certificate detail (returns 404)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/english/certificate/" + IDS.certB)
      const res = await certDetailGet(req, { params: makeParams(IDS.certB) })
      expect(res.status).toBe(404)
    })
  })

  // ============================================================================
  // 5. DATA EXPORTS (BIO, ESSAY, CV, CL, DECK, PROFILE)
  // ============================================================================
  describe("GET Document Exports", () => {
    test("User A can export their own bio with private cache headers", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      await db.document.update({
        where: { id: IDS.documentA },
        data: {
          type: "bio",
          content: JSON.stringify({ headline: "Headline", about: "About text", personal: ["Personal text"] }),
        },
      })

      const req = new Request("http://localhost/api/documents/bio/" + IDS.documentA + "/export")
      const res = await bioExportGet(req, { params: makeParams(IDS.documentA) })
      expect(res.status).toBe(200)
      expect(res.headers.get("Cache-Control")).toBe("private, no-store")
      expect(res.headers.get("Content-Type")).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    })

    test("User A can export their own essay with private cache headers", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      await db.document.update({
        where: { id: IDS.documentA },
        data: {
          type: "essay",
          content: JSON.stringify({ title: "Essay Title", paragraphs: ["Paragraph 1"] }),
        },
      })

      const req = new Request("http://localhost/api/documents/essay/" + IDS.documentA + "/export")
      const res = await essayExportGet(req, { params: makeParams(IDS.documentA) })
      expect(res.status).toBe(200)
      expect(res.headers.get("Cache-Control")).toBe("private, no-store")
    })

    test("User A can export their own cv-ats with private cache headers", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      await db.document.update({
        where: { id: IDS.documentA },
        data: {
          type: "cv-ats",
          content: JSON.stringify({
            headline: "Developer",
            summary: "Summary text",
            skillsByCategory: [],
            experiences: [],
          }),
        },
      })

      const req = new Request("http://localhost/api/documents/cv-ats/" + IDS.documentA + "/export")
      const res = await cvExportGet(req, { params: makeParams(IDS.documentA) })
      expect(res.status).toBe(200)
      expect(res.headers.get("Cache-Control")).toBe("private, no-store")
    })

    test("User A can export their own cover-letter with private cache headers", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      await db.document.update({
        where: { id: IDS.documentA },
        data: {
          type: "cover-letter",
          content: JSON.stringify({ recipientGreeting: "Dear HR,", paragraphs: ["I am applying."], closing: "Best" }),
        },
      })

      const req = new Request("http://localhost/api/documents/cover-letter/" + IDS.documentA + "/export")
      const res = await clExportGet(req, { params: makeParams(IDS.documentA) })
      expect(res.status).toBe(200)
      expect(res.headers.get("Cache-Control")).toBe("private, no-store")
    })

    test("User A can export their own deck with private cache headers", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/documents/deck/export")
      const res = await deckExportGet(req)
      expect(res.status).toBe(200)
      expect(res.headers.get("Cache-Control")).toBe("private, no-store")
      expect(res.headers.get("Content-Type")).toBe("application/vnd.openxmlformats-officedocument.presentationml.presentation")
    })

    test("User A cannot export User B's bio (returns 404)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      await db.document.update({ where: { id: IDS.documentB }, data: { type: "bio" } })

      const req = new Request("http://localhost/api/documents/bio/" + IDS.documentB + "/export")
      const res = await bioExportGet(req, { params: makeParams(IDS.documentB) })
      expect(res.status).toBe(404)
    })

    test("User A cannot export their own document if type mismatch (returns 404)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      // docA is type cv-ats, so exporting as bio should fail
      const req = new Request("http://localhost/api/documents/bio/" + IDS.documentA + "/export")
      const res = await bioExportGet(req, { params: makeParams(IDS.documentA) })
      expect(res.status).toBe(404)
    })

    test("User A can export their own profile data as JSON with private cache headers", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const res = await profileExportGet()
      expect(res.status).toBe(200)
      expect(res.headers.get("Cache-Control")).toBe("private, no-store")
      const body = await res.json()
      expect(body.profile.fullName).toBe("User A")
    })
  })

  // ============================================================================
  // 6. CONNECTIONS LIST AND SEARCH
  // ============================================================================
  describe("GET /api/connections and search", () => {
    test("User A can search other users by name (excluding self, matching name, ignoring email)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)

      // Search matching "User B"
      let req = new Request("http://localhost/api/connections?q=User%20B")
      let res = await connsGet(req)
      expect(res.status).toBe(200)
      let body = await res.json()
      expect(body.results).toBeArray()
      expect(body.results.some((r: any) => r.id === IDS.profileB)).toBe(true)

      // Search matching own name "User A" -> should exclude self
      req = new Request("http://localhost/api/connections?q=User%20A")
      res = await connsGet(req)
      body = await res.json()
      expect(body.results.some((r: any) => r.id === IDS.profileA)).toBe(false)

      // Search matching User B's email -> should NOT match (directory-eligible fields only)
      req = new Request("http://localhost/api/connections?q=user-b@example.com")
      res = await connsGet(req)
      body = await res.json()
      expect(body.results.some((r: any) => r.id === IDS.profileB)).toBe(false)
    })

    test("Search results hide private emails for strangers", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/connections?q=User%20B")
      const res = await connsGet(req)
      const body = await res.json()
      const bRes = body.results.find((r: any) => r.id === IDS.profileB)
      expect(bRes).toBeDefined()
      expect(bRes.email).toBeNull() // email is private by default and we are stranger
    })

    test("Connection lists apply visibility rules", async () => {
      // 1. Pending connection from B to A (A is addressee)
      const conn = await db.connection.create({
        data: {
          requesterId: IDS.profileB,
          addresseeId: IDS.profileA,
          status: "pending",
        },
      })

      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      let res = await connsGet(new Request("http://localhost/api/connections"))
      let body = await res.json()

      // A sees B in pendingIncoming
      const pendingIn = body.pendingIncoming.find((c: any) => c.other.id === IDS.profileB)
      expect(pendingIn).toBeDefined()
      expect(pendingIn.other.email).toBeNull() // still pending, so email is hidden

      // 2. Transition connection to accepted
      await db.connection.update({
        where: { id: conn.id },
        data: { status: "accepted" },
      })

      // B explicitly allows email to connections
      await db.consentSetting.create({
        data: {
          userProfileId: IDS.profileB,
          field: "email",
          visibility: "connections",
        },
      })

      res = await connsGet(new Request("http://localhost/api/connections"))
      body = await res.json()

      const acceptedConn = body.accepted.find((c: any) => c.other.id === IDS.profileB)
      expect(acceptedConn).toBeDefined()
      expect(acceptedConn.other.email).toBe("user-b@example.com") // now visible because accepted and allowed by consent
    })
  })
})
