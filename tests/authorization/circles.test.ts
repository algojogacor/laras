/// <reference types="bun-types" />

import { beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { resetTestRuntime, testRuntime } from "./test-runtime"

let circlesGet: any
let circlesPost: any
let circleDetailGet: any
let circleDetailPatch: any
let circleMembersGet: any
let circleMembersPost: any
let circleMembersDelete: any
let circleReviewsGet: any
let circleReviewsPost: any
let circleReviewsPut: any

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

describe.serial("Circles integration tests", () => {
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

    const circlesRoute = await import("@/app/api/circles/route")
    circlesGet = circlesRoute.GET
    circlesPost = circlesRoute.POST

    const circleDetailRoute = await import("@/app/api/circles/[id]/route")
    circleDetailGet = circleDetailRoute.GET
    circleDetailPatch = circleDetailRoute.PATCH

    const membersRoute = await import("@/app/api/circles/[id]/members/route")
    circleMembersGet = membersRoute.GET
    circleMembersPost = membersRoute.POST
    circleMembersDelete = membersRoute.DELETE

    const reviewsRoute = await import("@/app/api/circles/[id]/reviews/route")
    circleReviewsGet = reviewsRoute.GET
    circleReviewsPost = reviewsRoute.POST
    circleReviewsPut = reviewsRoute.PUT
  })

  beforeEach(async () => {
    resetTestRuntime()
    await cleanDb()
    await seedDb()
  })

  // ---- Anonymous ----
  test("anonymous cannot list circles", async () => {
    await clearActor()
    const req = new Request("http://localhost/api/circles")
    const res = await circlesGet(req)
    expect(res.status).toBe(401)
  })

  test("anonymous cannot create circle", async () => {
    await clearActor()
    const req = new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "Test Circle", type: "community" }),
    })
    const res = await circlesPost(req)
    expect(res.status).toBe(401)
  })

  // ---- Create Circle ----
  test("authenticated user can create a circle", async () => {
    await setActor(IDS.accountA)
    const req = new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "Test Community", type: "community" }),
    })
    const res = await circlesPost(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBeDefined()

    // Verify circle was created in DB
    const circle = await db.careerCircle.findUnique({ where: { id: body.id } })
    expect(circle).not.toBeNull()
    expect(circle!.name).toBe("Test Community")
    expect(circle!.type).toBe("community")
    expect(circle!.createdById).toBe(IDS.profileA)
  })

  test("creating circle auto-adds creator as admin member", async () => {
    await setActor(IDS.accountA)
    const req = new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "Admin Test", type: "study_group" }),
    })
    const res = await circlesPost(req)
    expect(res.status).toBe(201)
    const body = await res.json()

    const membership = await db.circleMembership.findFirst({
      where: { circleId: body.id, userProfileId: IDS.profileA },
    })
    expect(membership).not.toBeNull()
    expect(membership!.role).toBe("admin")
  })

  test("short name returns 400", async () => {
    await setActor(IDS.accountA)
    const req = new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "ab", type: "community" }),
    })
    const res = await circlesPost(req)
    expect(res.status).toBe(400)
  })

  test("invalid type returns 400", async () => {
    await setActor(IDS.accountA)
    const req = new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "Valid Name", type: "invalid_type" }),
    })
    const res = await circlesPost(req)
    expect(res.status).toBe(400)
  })

  // ---- List Circles ----
  test("list circles returns empty when none exist", async () => {
    await setActor(IDS.accountA)
    const req = new Request("http://localhost/api/circles")
    const res = await circlesGet(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.circles).toBeDefined()
    expect(body.circles.length).toBe(0)
  })

  test("list circles returns created circles", async () => {
    // Create a circle first
    await setActor(IDS.accountA)
    await circlesPost(new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "List Test", type: "community" }),
    }))

    const req = new Request("http://localhost/api/circles")
    const res = await circlesGet(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.circles.length).toBe(1)
    expect(body.circles[0].name).toBe("List Test")
  })

  // ---- Circle Detail ----
  test("get circle detail returns 400 for invalid ID", async () => {
    await setActor(IDS.accountA)
    const req = new Request("http://localhost/api/circles/not-a-cuid")
    const res = await circleDetailGet(req, { params: makeParams("not-a-cuid") })
    expect(res.status).toBe(400)
  })

  test("get circle detail returns 404 for missing circle", async () => {
    await setActor(IDS.accountA)
    const fakeId = "c" + "x".repeat(24)
    const req = new Request(`http://localhost/api/circles/${fakeId}`)
    const res = await circleDetailGet(req, { params: makeParams(fakeId) })
    expect(res.status).toBe(404)
  })

  test("get circle detail works for valid circle", async () => {
    await setActor(IDS.accountA)
    const createRes = await circlesPost(new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "Detail Test", type: "peer_review" }),
    }))
    const { id } = await createRes.json()

    const req = new Request(`http://localhost/api/circles/${id}`)
    const res = await circleDetailGet(req, { params: makeParams(id) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.circle.name).toBe("Detail Test")
    expect(body.circle.userRole).toBe("admin")
  })

  // ---- Join Circle ----
  test("can join an existing circle", async () => {
    // A creates a circle
    await setActor(IDS.accountA)
    const createRes = await circlesPost(new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "Join Test", type: "community" }),
    }))
    const { id } = await createRes.json()

    // B joins the circle
    await setActor(IDS.accountB)
    const req = new Request(`http://localhost/api/circles/${id}/members`, {
      method: "POST",
    })
    const res = await circleMembersPost(req, { params: makeParams(id) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.role).toBe("member")

    // Verify membership in DB
    const membership = await db.circleMembership.findFirst({
      where: { circleId: id, userProfileId: IDS.profileB },
    })
    expect(membership).not.toBeNull()
    expect(membership!.role).toBe("member")
  })

  test("joining same circle twice is idempotent", async () => {
    await setActor(IDS.accountA)
    const createRes = await circlesPost(new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "Double Join", type: "community" }),
    }))
    const { id } = await createRes.json()

    await setActor(IDS.accountB)
    await circleMembersPost(new Request(`http://localhost/api/circles/${id}/members`, {
      method: "POST",
    }), { params: makeParams(id) })

    // Second join should still succeed
    const res = await circleMembersPost(new Request(`http://localhost/api/circles/${id}/members`, {
      method: "POST",
    }), { params: makeParams(id) })
    expect(res.status).toBe(200)

    // Only one membership row
    const count = await db.circleMembership.count({
      where: { circleId: id, userProfileId: IDS.profileB },
    })
    expect(count).toBe(1)
  })

  // ---- Leave Circle ----
  test("can leave a circle", async () => {
    await setActor(IDS.accountA)
    const createRes = await circlesPost(new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "Leave Test", type: "community" }),
    }))
    const { id } = await createRes.json()

    await setActor(IDS.accountB)
    await circleMembersPost(new Request(`http://localhost/api/circles/${id}/members`, {
      method: "POST",
    }), { params: makeParams(id) })

    const req = new Request(`http://localhost/api/circles/${id}/members`, {
      method: "DELETE",
    })
    const res = await circleMembersDelete(req, { params: makeParams(id) })
    expect(res.status).toBe(200)

    // Verify membership removed
    const membership = await db.circleMembership.findFirst({
      where: { circleId: id, userProfileId: IDS.profileB },
    })
    expect(membership).toBeNull()
  })

  test("non-member cannot leave circle", async () => {
    await setActor(IDS.accountA)
    const createRes = await circlesPost(new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "No Leave", type: "community" }),
    }))
    const { id } = await createRes.json()

    await setActor(IDS.accountB)
    const req = new Request(`http://localhost/api/circles/${id}/members`, {
      method: "DELETE",
    })
    const res = await circleMembersDelete(req, { params: makeParams(id) })
    expect(res.status).toBe(404)
  })

  // ---- List Members ----
  test("list members returns all members", async () => {
    await setActor(IDS.accountA)
    const createRes = await circlesPost(new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "Members List", type: "community" }),
    }))
    const { id } = await createRes.json()

    await setActor(IDS.accountB)
    await circleMembersPost(new Request(`http://localhost/api/circles/${id}/members`, {
      method: "POST",
    }), { params: makeParams(id) })

    await setActor(IDS.accountA)
    const req = new Request(`http://localhost/api/circles/${id}/members`)
    const res = await circleMembersGet(req, { params: makeParams(id) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.members.length).toBe(2)
  })

  // ---- Promote/Demote Members ----
  test("admin can promote member to moderator", async () => {
    await setActor(IDS.accountA)
    const createRes = await circlesPost(new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "Promote Test", type: "community" }),
    }))
    const { id } = await createRes.json()

    // B joins
    await setActor(IDS.accountB)
    await circleMembersPost(new Request(`http://localhost/api/circles/${id}/members`, {
      method: "POST",
    }), { params: makeParams(id) })

    // A promotes B
    await setActor(IDS.accountA)
    const req = new Request(`http://localhost/api/circles/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "promote", targetProfileId: IDS.profileB, role: "moderator" }),
    })
    const res = await circleDetailPatch(req, { params: makeParams(id) })
    expect(res.status).toBe(200)

    const membership = await db.circleMembership.findFirst({
      where: { circleId: id, userProfileId: IDS.profileB },
    })
    expect(membership!.role).toBe("moderator")
  })

  test("non-admin cannot promote members", async () => {
    await setActor(IDS.accountA)
    const createRes = await circlesPost(new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "NoPromote", type: "community" }),
    }))
    const { id } = await createRes.json()

    // B joins as member
    await setActor(IDS.accountB)
    await circleMembersPost(new Request(`http://localhost/api/circles/${id}/members`, {
      method: "POST",
    }), { params: makeParams(id) })

    // B tries to promote someone
    const req = new Request(`http://localhost/api/circles/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "promote", targetProfileId: IDS.profileA, role: "moderator" }),
    })
    const res = await circleDetailPatch(req, { params: makeParams(id) })
    expect(res.status).toBe(403)
  })

  // ---- Peer Review ----
  test("member can request peer review", async () => {
    await setActor(IDS.accountA)
    const createRes = await circlesPost(new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "Review Test", type: "peer_review" }),
    }))
    const { id } = await createRes.json()

    const req = new Request(`http://localhost/api/circles/${id}/reviews`, {
      method: "POST",
      body: JSON.stringify({ prompt: "Please review my resume summary for clarity." }),
    })
    const res = await circleReviewsPost(req, { params: makeParams(id) })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBeDefined()
  })

  test("non-member cannot request peer review", async () => {
    await setActor(IDS.accountA)
    const createRes = await circlesPost(new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "NoReview", type: "peer_review" }),
    }))
    const { id } = await createRes.json()

    await setActor(IDS.accountB)
    const req = new Request(`http://localhost/api/circles/${id}/reviews`, {
      method: "POST",
      body: JSON.stringify({ prompt: "Should not work because B is not a member." }),
    })
    const res = await circleReviewsPost(req, { params: makeParams(id) })
    expect(res.status).toBe(403)
  })

  test("member can submit a review", async () => {
    await setActor(IDS.accountA)
    const createRes = await circlesPost(new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "Submit Review", type: "peer_review" }),
    }))
    const { id } = await createRes.json()

    // A requests review
    const requestRes = await circleReviewsPost(new Request(`http://localhost/api/circles/${id}/reviews`, {
      method: "POST",
      body: JSON.stringify({ prompt: "Please review my project description." }),
    }), { params: makeParams(id) })
    const { id: reviewId } = await requestRes.json()

    // B joins the circle
    await setActor(IDS.accountB)
    await circleMembersPost(new Request(`http://localhost/api/circles/${id}/members`, {
      method: "POST",
    }), { params: makeParams(id) })

    // B submits review
    const req = new Request(`http://localhost/api/circles/${id}/reviews`, {
      method: "PUT",
      body: JSON.stringify({
        reviewId,
        feedback: "Great project description! Consider adding more metrics.",
        rating: { clarity: 4, specificity: 3, actionability: 5 },
      }),
    })
    const res = await circleReviewsPut(req, { params: makeParams(id) })
    expect(res.status).toBe(200)
  })

  test("cannot self-review", async () => {
    await setActor(IDS.accountA)
    const createRes = await circlesPost(new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "Self Review", type: "peer_review" }),
    }))
    const { id } = await createRes.json()

    const requestRes = await circleReviewsPost(new Request(`http://localhost/api/circles/${id}/reviews`, {
      method: "POST",
      body: JSON.stringify({ prompt: "Review my own work." }),
    }), { params: makeParams(id) })
    const { id: reviewId } = await requestRes.json()

    // A tries to review own request
    const req = new Request(`http://localhost/api/circles/${id}/reviews`, {
      method: "PUT",
      body: JSON.stringify({
        reviewId,
        feedback: "I think my work is great!",
        rating: { clarity: 5, specificity: 5, actionability: 5 },
      }),
    })
    const res = await circleReviewsPut(req, { params: makeParams(id) })
    expect(res.status).toBe(400)
  })

  test("reviews are isolated between circles", async () => {
    // A creates circle 1
    await setActor(IDS.accountA)
    const c1Res = await circlesPost(new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "Circle 1", type: "peer_review" }),
    }))
    const { id: circle1Id } = await c1Res.json()

    // A creates circle 2
    const c2Res = await circlesPost(new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "Circle 2", type: "peer_review" }),
    }))
    const { id: circle2Id } = await c2Res.json()

    // A requests review in circle 1
    const r1Res = await circleReviewsPost(new Request(`http://localhost/api/circles/${circle1Id}/reviews`, {
      method: "POST",
      body: JSON.stringify({ prompt: "Review in circle 1." }),
    }), { params: makeParams(circle1Id) })
    expect(r1Res.status).toBe(201)

    // Get reviews for circle 1 - should have 1
    const g1Res = await circleReviewsGet(new Request(`http://localhost/api/circles/${circle1Id}/reviews`), { params: makeParams(circle1Id) })
    const g1Body = await g1Res.json()
    expect(g1Body.reviews.length).toBe(1)

    // Get reviews for circle 2 - should have 0
    const g2Res = await circleReviewsGet(new Request(`http://localhost/api/circles/${circle2Id}/reviews`), { params: makeParams(circle2Id) })
    const g2Body = await g2Res.json()
    expect(g2Body.reviews.length).toBe(0)
  })

  // ---- Delete Circle ----
  test("admin can delete circle", async () => {
    await setActor(IDS.accountA)
    const createRes = await circlesPost(new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "Delete Me", type: "community" }),
    }))
    const { id } = await createRes.json()

    const req = new Request(`http://localhost/api/circles/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "delete" }),
    })
    const res = await circleDetailPatch(req, { params: makeParams(id) })
    expect(res.status).toBe(200)

    const circle = await db.careerCircle.findUnique({ where: { id } })
    expect(circle).toBeNull()
  })

  test("non-admin cannot delete circle", async () => {
    await setActor(IDS.accountA)
    const createRes = await circlesPost(new Request("http://localhost/api/circles", {
      method: "POST",
      body: JSON.stringify({ name: "Cant Delete", type: "community" }),
    }))
    const { id } = await createRes.json()

    // B joins
    await setActor(IDS.accountB)
    await circleMembersPost(new Request(`http://localhost/api/circles/${id}/members`, {
      method: "POST",
    }), { params: makeParams(id) })

    // B tries to delete
    const req = new Request(`http://localhost/api/circles/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "delete" }),
    })
    const res = await circleDetailPatch(req, { params: makeParams(id) })
    expect(res.status).toBe(403)

    // Circle should still exist
    const circle = await db.careerCircle.findUnique({ where: { id } })
    expect(circle).not.toBeNull()
  })
})
