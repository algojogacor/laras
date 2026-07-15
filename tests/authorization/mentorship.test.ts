/// <reference types="bun-types" />

import { beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { resetTestRuntime, testRuntime } from "./test-runtime"

let profileGet: any
let profilePut: any
let requestsGet: any
let requestsPost: any
let requestsPatch: any
let sessionsGet: any
let sessionsPost: any
let sessionsPatch: any

let cleanDb: any, seedDb: any, IDS: any
let createSessionToken: any, isValidId: any
let db: any

async function setActor(accountId: string) {
  testRuntime.cookieValue = await createSessionToken(accountId)
}

async function clearActor() {
  testRuntime.cookieValue = undefined
}

function makeParams(id: string): Promise<{ id: string }> {
  return Promise.resolve({ id })
}

describe.serial("Mentorship integration tests", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-key-32-chars-long-or-more"

    const fix = await import("./fixtures")
    cleanDb = fix.cleanDb
    seedDb = fix.seedDb
    IDS = fix.IDS

    const authMod = await import("@/lib/auth")
    createSessionToken = authMod.createSessionToken

    const authzMod = await import("@/lib/authorization")
    isValidId = authzMod.isValidId

    const dMod = await import("@/lib/db")
    db = dMod.db

    const profileRoute = await import("@/app/api/mentorship/profile/route")
    profileGet = profileRoute.GET
    profilePut = profileRoute.PUT

    const requestsRoute = await import("@/app/api/mentorship/requests/route")
    requestsGet = requestsRoute.GET
    requestsPost = requestsRoute.POST

    const requestsDetailRoute = await import("@/app/api/mentorship/requests/[id]/route")
    requestsPatch = requestsDetailRoute.PATCH

    const sessionsRoute = await import("@/app/api/mentorship/sessions/route")
    sessionsGet = sessionsRoute.GET
    sessionsPost = sessionsRoute.POST

    const sessionsDetailRoute = await import("@/app/api/mentorship/sessions/[id]/route")
    sessionsPatch = sessionsDetailRoute.PATCH
  })

  beforeEach(async () => {
    resetTestRuntime()
    await cleanDb()
    await seedDb()
  })

  // ---- Anonymous ----
  test("anonymous cannot access mentorship profile", async () => {
    await clearActor()
    const req = new Request("http://localhost/api/mentorship/profile")
    const res = await profileGet(req)
    expect(res.status).toBe(401)
  })

  test("anonymous cannot create mentorship profile", async () => {
    await clearActor()
    const req = new Request("http://localhost/api/mentorship/profile", {
      method: "PUT",
      body: JSON.stringify({ isMentor: true }),
    })
    const res = await profilePut(req)
    expect(res.status).toBe(401)
  })

  // ---- Mentorship Profile CRUD ----
  test("authenticated user can create mentorship profile", async () => {
    await setActor(IDS.accountA)
    const req = new Request("http://localhost/api/mentorship/profile", {
      method: "PUT",
      body: JSON.stringify({
        isMentor: true,
        isMentee: false,
        mentorTopics: ["career", "technical"],
        bio: "Experienced developer.",
        availability: "weekly",
      }),
    })
    const res = await profilePut(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile).toBeDefined()
    expect(body.profile.isMentor).toBe(true)
    expect(body.profile.mentorTopics).toEqual(["career", "technical"])
  })

  test("can retrieve mentorship profile", async () => {
    await setActor(IDS.accountA)
    await profilePut(new Request("http://localhost/api/mentorship/profile", {
      method: "PUT",
      body: JSON.stringify({ isMentor: true }),
    }))

    const req = new Request("http://localhost/api/mentorship/profile")
    const res = await profileGet(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile).not.toBeNull()
    expect(body.profile.isMentor).toBe(true)
  })

  test("can update mentorship profile", async () => {
    await setActor(IDS.accountA)
    // Create
    await profilePut(new Request("http://localhost/api/mentorship/profile", {
      method: "PUT",
      body: JSON.stringify({ isMentor: true, bio: "Old bio" }),
    }))

    // Update
    const req = new Request("http://localhost/api/mentorship/profile", {
      method: "PUT",
      body: JSON.stringify({ isMentor: true, isMentee: true, bio: "Updated bio" }),
    })
    const res = await profilePut(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile.isMentor).toBe(true)
    expect(body.profile.isMentee).toBe(true)
    expect(body.profile.bio).toBe("Updated bio")
  })

  test("null profile returned when not set up", async () => {
    await setActor(IDS.accountA)
    const req = new Request("http://localhost/api/mentorship/profile")
    const res = await profileGet(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile).toBeNull()
  })

  // ---- Mentorship Requests ----
  test("can request mentorship from a mentor", async () => {
    // B sets up as mentor
    await setActor(IDS.accountB)
    await profilePut(new Request("http://localhost/api/mentorship/profile", {
      method: "PUT",
      body: JSON.stringify({ isMentor: true, mentorTopics: ["career"] }),
    }))

    // A requests mentorship from B
    await setActor(IDS.accountA)
    const req = new Request("http://localhost/api/mentorship/requests", {
      method: "POST",
      body: JSON.stringify({
        mentorId: IDS.profileB,
        message: "I'd love to learn from you!",
        goals: [{ goal: "Improve career prospects", timeline: "3 months" }],
      }),
    })
    const res = await requestsPost(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBeDefined()

    // Verify in DB
    const request = await db.mentorshipRequest.findFirst({
      where: { mentorId: IDS.profileB, menteeId: IDS.profileA },
    })
    expect(request).not.toBeNull()
    expect(request!.status).toBe("pending")
  })

  test("cannot request self-mentorship", async () => {
    await setActor(IDS.accountA)
    await profilePut(new Request("http://localhost/api/mentorship/profile", {
      method: "PUT",
      body: JSON.stringify({ isMentor: true }),
    }))

    const req = new Request("http://localhost/api/mentorship/requests", {
      method: "POST",
      body: JSON.stringify({ mentorId: IDS.profileA, message: "Self mentor" }),
    })
    const res = await requestsPost(req)
    expect(res.status).toBe(400)
  })

  test("cannot request from non-mentor", async () => {
    await setActor(IDS.accountA)
    // B has no mentorship profile
    const req = new Request("http://localhost/api/mentorship/requests", {
      method: "POST",
      body: JSON.stringify({ mentorId: IDS.profileB, message: "Be my mentor!" }),
    })
    const res = await requestsPost(req)
    // This returns NOT_FOUND because the mentorProfile lookup fails
    expect([404, 403]).toContain(res.status)
  })

  test("duplicate request returns 409", async () => {
    await setActor(IDS.accountB)
    await profilePut(new Request("http://localhost/api/mentorship/profile", {
      method: "PUT",
      body: JSON.stringify({ isMentor: true }),
    }))

    await setActor(IDS.accountA)
    // First request
    await requestsPost(new Request("http://localhost/api/mentorship/requests", {
      method: "POST",
      body: JSON.stringify({ mentorId: IDS.profileB, message: "First request" }),
    }))

    // Second request
    const req = new Request("http://localhost/api/mentorship/requests", {
      method: "POST",
      body: JSON.stringify({ mentorId: IDS.profileB, message: "Second request" }),
    })
    const res = await requestsPost(req)
    expect(res.status).toBe(409)
  })

  // ---- Accept/Decline ----
  test("mentor can accept request", async () => {
    await setActor(IDS.accountB)
    await profilePut(new Request("http://localhost/api/mentorship/profile", {
      method: "PUT",
      body: JSON.stringify({ isMentor: true }),
    }))

    await setActor(IDS.accountA)
    const createRes = await requestsPost(new Request("http://localhost/api/mentorship/requests", {
      method: "POST",
      body: JSON.stringify({ mentorId: IDS.profileB, message: "Please mentor me!" }),
    }))
    const { id } = await createRes.json()

    await setActor(IDS.accountB)
    const req = new Request(`http://localhost/api/mentorship/requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "accept" }),
    })
    const res = await requestsPatch(req, { params: makeParams(id) })
    expect(res.status).toBe(200)

    const request = await db.mentorshipRequest.findUnique({ where: { id } })
    expect(request!.status).toBe("accepted")
  })

  test("non-mentor cannot accept request", async () => {
    await setActor(IDS.accountB)
    await profilePut(new Request("http://localhost/api/mentorship/profile", {
      method: "PUT",
      body: JSON.stringify({ isMentor: true }),
    }))

    await setActor(IDS.accountA)
    const createRes = await requestsPost(new Request("http://localhost/api/mentorship/requests", {
      method: "POST",
      body: JSON.stringify({ mentorId: IDS.profileB, message: "Help!" }),
    }))
    const { id } = await createRes.json()

    // A tries to accept own request (as mentee, not mentor)
    const req = new Request(`http://localhost/api/mentorship/requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "accept" }),
    })
    const res = await requestsPatch(req, { params: makeParams(id) })
    // Should fail because A is not the mentor
    expect(res.status).toBe(404)
  })

  test("mentor can decline request", async () => {
    await setActor(IDS.accountB)
    await profilePut(new Request("http://localhost/api/mentorship/profile", {
      method: "PUT",
      body: JSON.stringify({ isMentor: true }),
    }))

    await setActor(IDS.accountA)
    const createRes = await requestsPost(new Request("http://localhost/api/mentorship/requests", {
      method: "POST",
      body: JSON.stringify({ mentorId: IDS.profileB, message: "Mentor me!" }),
    }))
    const { id } = await createRes.json()

    await setActor(IDS.accountB)
    const req = new Request(`http://localhost/api/mentorship/requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "decline" }),
    })
    const res = await requestsPatch(req, { params: makeParams(id) })
    expect(res.status).toBe(200)

    const request = await db.mentorshipRequest.findUnique({ where: { id } })
    expect(request!.status).toBe("declined")
  })

  // ---- List Requests ----
  test("can list incoming mentorship requests", async () => {
    await setActor(IDS.accountB)
    await profilePut(new Request("http://localhost/api/mentorship/profile", {
      method: "PUT",
      body: JSON.stringify({ isMentor: true }),
    }))

    await setActor(IDS.accountA)
    await requestsPost(new Request("http://localhost/api/mentorship/requests", {
      method: "POST",
      body: JSON.stringify({ mentorId: IDS.profileB, message: "Request 1" }),
    }))

    // B lists incoming
    await setActor(IDS.accountB)
    const req = new Request("http://localhost/api/mentorship/requests?filter=incoming")
    const res = await requestsGet(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.requests.length).toBe(1)
    expect(body.requests[0].status).toBe("pending")
  })

  test("can list outgoing mentorship requests", async () => {
    await setActor(IDS.accountB)
    await profilePut(new Request("http://localhost/api/mentorship/profile", {
      method: "PUT",
      body: JSON.stringify({ isMentor: true }),
    }))

    await setActor(IDS.accountA)
    await requestsPost(new Request("http://localhost/api/mentorship/requests", {
      method: "POST",
      body: JSON.stringify({ mentorId: IDS.profileB, message: "Request 1" }),
    }))

    // A lists outgoing
    const req = new Request("http://localhost/api/mentorship/requests?filter=outgoing")
    const res = await requestsGet(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.requests.length).toBe(1)
  })

  // ---- Sessions ----
  test("can schedule a mentorship session after acceptance", async () => {
    // B is mentor
    await setActor(IDS.accountB)
    await profilePut(new Request("http://localhost/api/mentorship/profile", {
      method: "PUT",
      body: JSON.stringify({ isMentor: true }),
    }))

    // A requests
    await setActor(IDS.accountA)
    const createRes = await requestsPost(new Request("http://localhost/api/mentorship/requests", {
      method: "POST",
      body: JSON.stringify({ mentorId: IDS.profileB, message: "Mentor me!" }),
    }))
    const { id: requestId } = await createRes.json()

    // B accepts
    await setActor(IDS.accountB)
    await requestsPatch(
      new Request(`http://localhost/api/mentorship/requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "accept" }),
      }),
      { params: makeParams(requestId) }
    )

    // A schedules session
    await setActor(IDS.accountA)
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const req = new Request("http://localhost/api/mentorship/sessions", {
      method: "POST",
      body: JSON.stringify({
        mentorId: IDS.profileB,
        menteeId: IDS.profileA,
        title: "Career Planning Session",
        scheduledAt: futureDate,
        requestId,
        notes: "Discuss career roadmap.",
      }),
    })
    const res = await sessionsPost(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBeDefined()

    // Verify in DB
    const session = await db.mentorshipSession.findUnique({ where: { id: body.id } })
    expect(session).not.toBeNull()
    expect(session!.title).toBe("Career Planning Session")
    expect(session!.mentorId).toBe(IDS.profileB)
    expect(session!.menteeId).toBe(IDS.profileA)
  })

  test("cannot schedule session without accepted request", async () => {
    await setActor(IDS.accountA)
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const req = new Request("http://localhost/api/mentorship/sessions", {
      method: "POST",
      body: JSON.stringify({
        mentorId: IDS.profileB,
        menteeId: IDS.profileA,
        title: "Invalid Session",
        scheduledAt: futureDate,
      }),
    })
    const res = await sessionsPost(req)
    expect(res.status).toBe(403)
  })

  test("outsider cannot schedule session for others", async () => {
    // B is mentor
    await setActor(IDS.accountB)
    await profilePut(new Request("http://localhost/api/mentorship/profile", {
      method: "PUT",
      body: JSON.stringify({ isMentor: true }),
    }))

    // A requests, B accepts
    await setActor(IDS.accountA)
    const createRes = await requestsPost(new Request("http://localhost/api/mentorship/requests", {
      method: "POST",
      body: JSON.stringify({ mentorId: IDS.profileB, message: "Mentor" }),
    }))
    const { id: requestId } = await createRes.json()

    await setActor(IDS.accountB)
    await requestsPatch(
      new Request(`http://localhost/api/mentorship/requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "accept" }),
      }),
      { params: makeParams(requestId) }
    )

    // C (outsider) tries to schedule
    await setActor(IDS.adminC)
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const req = new Request("http://localhost/api/mentorship/sessions", {
      method: "POST",
      body: JSON.stringify({
        mentorId: IDS.profileB,
        menteeId: IDS.profileA,
        title: "Outsider Session",
        scheduledAt: futureDate,
      }),
    })
    const res = await sessionsPost(req)
    expect(res.status).toBe(403)
  })

  test("can complete a session", async () => {
    // Setup: B is mentor, A requests, B accepts, A schedules
    await setActor(IDS.accountB)
    await profilePut(new Request("http://localhost/api/mentorship/profile", {
      method: "PUT",
      body: JSON.stringify({ isMentor: true }),
    }))

    await setActor(IDS.accountA)
    const createRes = await requestsPost(new Request("http://localhost/api/mentorship/requests", {
      method: "POST",
      body: JSON.stringify({ mentorId: IDS.profileB, message: "Mentor" }),
    }))
    const { id: requestId } = await createRes.json()

    await setActor(IDS.accountB)
    await requestsPatch(
      new Request(`http://localhost/api/mentorship/requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "accept" }),
      }),
      { params: makeParams(requestId) }
    )

    await setActor(IDS.accountA)
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const sessionRes = await sessionsPost(new Request("http://localhost/api/mentorship/sessions", {
      method: "POST",
      body: JSON.stringify({
        mentorId: IDS.profileB,
        menteeId: IDS.profileA,
        title: "Complete Test",
        scheduledAt: futureDate,
      }),
    }))
    const { id: sessionId } = await sessionRes.json()

    // A completes the session
    const req = new Request(`http://localhost/api/mentorship/sessions/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify({
        action: "complete",
        feedback: { rating: 5, comments: "Great session!", goalsProgress: "On track" },
      }),
    })
    const res = await sessionsPatch(req, { params: makeParams(sessionId) })
    expect(res.status).toBe(200)

    const session = await db.mentorshipSession.findUnique({ where: { id: sessionId } })
    expect(session!.completedAt).not.toBeNull()
    expect(session!.feedback).not.toBeNull()
  })

  test("can list sessions", async () => {
    // Setup and create session
    await setActor(IDS.accountB)
    await profilePut(new Request("http://localhost/api/mentorship/profile", {
      method: "PUT",
      body: JSON.stringify({ isMentor: true }),
    }))

    await setActor(IDS.accountA)
    const createRes = await requestsPost(new Request("http://localhost/api/mentorship/requests", {
      method: "POST",
      body: JSON.stringify({ mentorId: IDS.profileB, message: "Mentor" }),
    }))
    const { id: requestId } = await createRes.json()

    await setActor(IDS.accountB)
    await requestsPatch(
      new Request(`http://localhost/api/mentorship/requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "accept" }),
      }),
      { params: makeParams(requestId) }
    )

    await setActor(IDS.accountA)
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    await sessionsPost(new Request("http://localhost/api/mentorship/sessions", {
      method: "POST",
      body: JSON.stringify({
        mentorId: IDS.profileB,
        menteeId: IDS.profileA,
        title: "List Test",
        scheduledAt: futureDate,
      }),
    }))

    // A lists sessions
    const req = new Request("http://localhost/api/mentorship/sessions")
    const res = await sessionsGet(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessions.length).toBe(1)
    expect(body.sessions[0].title).toBe("List Test")
  })

  // ---- Authorization ----
  test("users only see their own mentorship profile", async () => {
    await setActor(IDS.accountA)
    await profilePut(new Request("http://localhost/api/mentorship/profile", {
      method: "PUT",
      body: JSON.stringify({ isMentor: true, bio: "A's profile" }),
    }))

    // B queries their own profile - should be null (not set up)
    await setActor(IDS.accountB)
    const req = new Request("http://localhost/api/mentorship/profile")
    const res = await profileGet(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    // B should not see A's profile
    expect(body.profile).toBeNull()
  })
})
