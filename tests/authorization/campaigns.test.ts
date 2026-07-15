/// <reference types="bun-types" />

import { beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { db } from "@/lib/db"
import { resetTestRuntime, testRuntime } from "./test-runtime"
import { cleanDb, seedDb, IDS } from "./fixtures"
import { createSessionToken } from "@/lib/auth"
import { PLAN_RANK, PLAN_FEATURES } from "@/lib/entitlement"

let adminCampaignsGet: any
let adminCampaignsPost: any
let adminCampaignsPatch: any
let adminFeaturesGet: any
let adminFeaturesPost: any
let adminFeaturesDelete: any
let adminConfigGet: any
let adminConfigPost: any
let adminConfigDelete: any

describe("Phase 5B+5C — Campaigns, Feature Flags & Dynamic Config", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-key-32-chars-long-or-more"

    const campaignsRoute = await import("@/app/api/admin/campaigns/route")
    adminCampaignsGet = campaignsRoute.GET
    adminCampaignsPost = campaignsRoute.POST
    adminCampaignsPatch = campaignsRoute.PATCH

    const featuresRoute = await import("@/app/api/admin/features/route")
    adminFeaturesGet = featuresRoute.GET
    adminFeaturesPost = featuresRoute.POST
    adminFeaturesDelete = featuresRoute.DELETE

    const configRoute = await import("@/app/api/admin/config/route")
    adminConfigGet = configRoute.GET
    adminConfigPost = configRoute.POST
    adminConfigDelete = configRoute.DELETE
  })

  beforeEach(async () => {
    resetTestRuntime()
    await cleanDb()
    await seedDb()
  })

  // ============================================================================
  // CAMPAIGN ADMIN API
  // ============================================================================
  describe("Campaign Admin API", () => {
    test("Admin creates a campaign", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)

      const req = new Request("http://localhost/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Summer Launch",
          plan: "pro",
          maxSeats: 50,
        }),
      })
      const res = await adminCampaignsPost(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.campaign).toBeObject()
      expect(body.campaign.name).toBe("Summer Launch")
      expect(body.campaign.plan).toBe("pro")
      expect(body.campaign.maxSeats).toBe(50)
      expect(body.campaign.isActive).toBe(true)
    })

    test("Admin lists campaigns", async () => {
      // First create one
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)
      await adminCampaignsPost(
        new Request("http://localhost/api/admin/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Test Campaign", plan: "plus" }),
        })
      )

      const req = new Request("http://localhost/api/admin/campaigns")
      const res = await adminCampaignsGet(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.campaigns).toBeArray()
      expect(body.campaigns.length).toBe(1)
      expect(body.campaigns[0].name).toBe("Test Campaign")
      expect(body.campaigns[0].plan).toBe("plus")
    })

    test("Non-admin cannot create campaign", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)

      const req = new Request("http://localhost/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Hacker Campaign", plan: "max" }),
      })
      const res = await adminCampaignsPost(req)
      expect(res.status).toBe(403)
    })

    test("Admin can update campaign", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)

      // Create first
      const createReq = new Request("http://localhost/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Original", plan: "free" }),
      })
      const createRes = await adminCampaignsPost(createReq)
      const createBody = await createRes.json()
      const campaignId = createBody.campaign.id

      // Update
      const updateReq = new Request("http://localhost/api/admin/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, name: "Updated Name" }),
      })
      const updateRes = await adminCampaignsPatch(updateReq)
      expect(updateRes.status).toBe(200)
      const updateBody = await updateRes.json()
      expect(updateBody.campaign.name).toBe("Updated Name")
    })

    test("Expired campaign is still listed but has isActive control", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)

      // Create with past expiry
      const req = new Request("http://localhost/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Expired Campaign",
          plan: "plus",
          expiresAt: new Date("2020-01-01").toISOString(),
        }),
      })
      const res = await adminCampaignsPost(req)
      expect(res.status).toBe(200)

      // Still appears in list (admin view includes all)
      const listReq = new Request("http://localhost/api/admin/campaigns")
      const listRes = await adminCampaignsGet(listReq)
      const listBody = await listRes.json()
      expect(listBody.campaigns.length).toBe(1)
    })
  })

  // ============================================================================
  // CAMPAIGN SERVICE (direct DB)
  // ============================================================================
  describe("Campaign Service", () => {
    test("assignToCampaign adds user and consumes seat", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)

      // Create campaign
      const createReq = new Request("http://localhost/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Seat Test", plan: "pro", maxSeats: 2 }),
      })
      const createRes = await adminCampaignsPost(createReq)
      const createBody = await createRes.json()
      const campaignId = createBody.campaign.id

      // Assign user A
      const { assignToCampaign } = await import("@/lib/campaigns")
      const result = await assignToCampaign(IDS.profileA, campaignId)
      expect(result.ok).toBe(true)

      // Verify campaign seat count increased
      const campaign = await db.campaign.findUnique({ where: { id: campaignId } })
      expect(campaign?.usedSeats).toBe(1)

      // Duplicate assignment
      const result2 = await assignToCampaign(IDS.profileA, campaignId)
      expect(result2.ok).toBe(false)
      expect(result2.reason).toBe("already-member")
    })

    test("getUserCampaigns returns active campaigns", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)

      // Create campaign
      const createReq = new Request("http://localhost/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "User Campaign", plan: "plus" }),
      })
      const createRes = await adminCampaignsPost(createReq)
      const createBody = await createRes.json()
      const campaignId = createBody.campaign.id

      // Assign user
      const { assignToCampaign, getUserCampaigns } = await import("@/lib/campaigns")
      await assignToCampaign(IDS.profileB, campaignId)

      // Check user campaigns
      const campaigns = await getUserCampaigns(IDS.profileB)
      expect(campaigns.length).toBe(1)
      expect(campaigns[0].name).toBe("User Campaign")
      expect(campaigns[0].isActive).toBe(true)
    })

    test("Expired campaign doesn't grant entitlements", async () => {
      // Create campaign with past expiry directly
      const campaign = await db.campaign.create({
        data: {
          name: "Old Campaign",
          plan: "pro",
          expiresAt: new Date("2020-01-01"),
          isActive: true,
          createdById: IDS.adminC,
        },
      })

      const { assignToCampaign } = await import("@/lib/campaigns")
      const result = await assignToCampaign(IDS.profileA, campaign.id)
      // Should fail because campaign is expired
      expect(result.ok).toBe(false)
      expect(result.reason).toBe("expired")
    })
  })

  // ============================================================================
  // FEATURE FLAGS API
  // ============================================================================
  describe("Feature Flag API", () => {
    test("Admin can create and list feature flags", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)

      // Create
      const postReq = new Request("http://localhost/api/admin/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "beta.dashboard",
          enabled: true,
          description: "New dashboard",
        }),
      })
      const postRes = await adminFeaturesPost(postReq)
      expect(postRes.status).toBe(200)

      // List
      const getReq = new Request("http://localhost/api/admin/features")
      const getRes = await adminFeaturesGet(getReq)
      const getBody = await getRes.json()
      expect(getBody.flags.length).toBe(1)
      expect(getBody.flags[0].key).toBe("beta.dashboard")
      expect(getBody.flags[0].enabled).toBe(true)
    })

    test("Feature flag with plan rules evaluated correctly", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)

      // Create flag restricted to pro+ plans
      await adminFeaturesPost(
        new Request("http://localhost/api/admin/features", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "premium.feature",
            enabled: true,
            rules: { plans: ["pro", "max"] },
          }),
        })
      )

      // Evaluate
      const { isFeatureEnabled } = await import("@/lib/feature-flags")

      // Pro plan should pass
      const proResult = await isFeatureEnabled("premium.feature", { plan: "pro" })
      expect(proResult).toBe(true)

      // Free plan should fail
      const freeResult = await isFeatureEnabled("premium.feature", { plan: "free" })
      expect(freeResult).toBe(false)

      // Plus plan should also fail
      const plusResult = await isFeatureEnabled("premium.feature", { plan: "plus" })
      expect(plusResult).toBe(false)
    })

    test("Feature flag with role rules", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)

      await adminFeaturesPost(
        new Request("http://localhost/api/admin/features", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "admin.tool",
            enabled: true,
            rules: { roles: ["admin", "owner"] },
          }),
        })
      )

      const { isFeatureEnabled } = await import("@/lib/feature-flags")

      // Admin role passes
      const adminResult = await isFeatureEnabled("admin.tool", { role: "admin" })
      expect(adminResult).toBe(true)

      // User role fails
      const userResult = await isFeatureEnabled("admin.tool", { role: "user" })
      expect(userResult).toBe(false)
    })

    test("Feature flag with percentage rollout", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)

      await adminFeaturesPost(
        new Request("http://localhost/api/admin/features", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "gradual.rollout",
            enabled: true,
            rules: { percentage: 50 },
          }),
        })
      )

      const { isFeatureEnabled } = await import("@/lib/feature-flags")

      // Test 100 deterministic calls — should see some true and some false
      let trueCount = 0
      for (let i = 0; i < 100; i++) {
        const result = await isFeatureEnabled("gradual.rollout", { seed: `user-${i}` })
        if (result) trueCount++
      }
      // With 50% rollout, expect roughly 50% to pass (tolerance: 20-80)
      expect(trueCount).toBeGreaterThan(10)
      expect(trueCount).toBeLessThan(90)
    })

    test("Non-admin cannot create feature flags", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)

      const req = new Request("http://localhost/api/admin/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "hack.feature",
          enabled: true,
        }),
      })
      const res = await adminFeaturesPost(req)
      expect(res.status).toBe(403)
    })

    test("Admin can delete feature flag", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)

      // Create first
      await adminFeaturesPost(
        new Request("http://localhost/api/admin/features", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "temp.flag", enabled: true }),
        })
      )

      // Delete
      const delReq = new Request("http://localhost/api/admin/features", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "temp.flag" }),
      })
      const delRes = await adminFeaturesDelete(delReq)
      expect(delRes.status).toBe(200)
    })
  })

  // ============================================================================
  // DYNAMIC CONFIG API
  // ============================================================================
  describe("Dynamic Config API", () => {
    test("Admin can set and get config", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)

      // Set config
      const postReq = new Request("http://localhost/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "app.max_upload_size",
          value: 10485760,
        }),
      })
      const postRes = await adminConfigPost(postReq)
      expect(postRes.status).toBe(200)

      // Get config via service
      const { getConfig } = await import("@/lib/feature-flags")
      const value = await getConfig<number>("app.max_upload_size")
      expect(value).toBe(10485760)
    })

    test("Config returns null for missing key", async () => {
      const { getConfig } = await import("@/lib/feature-flags")
      const value = await getConfig("nonexistent.key")
      expect(value).toBeNull()
    })

    test("Non-admin cannot set config", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)

      const req = new Request("http://localhost/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "hack.config", value: "bad" }),
      })
      const res = await adminConfigPost(req)
      expect(res.status).toBe(403)
    })

    test("Config cache works correctly", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)

      const { getConfig, setConfig, invalidateConfigCache } = await import("@/lib/feature-flags")

      // Set initial value
      await setConfig("cached.key", "value1", IDS.adminC)

      // First read should hit DB
      const val1 = await getConfig("cached.key")
      expect(val1).toBe("value1")

      // Change value directly in DB (bypass cache)
      await db.dynamicConfig.update({
        where: { key: "cached.key" },
        data: { value: '"value2"' },
      })

      // Second read within 60s TTL should still return cached value
      const val2 = await getConfig("cached.key")
      expect(val2).toBe("value1") // still cached

      // Invalidate and re-read
      invalidateConfigCache("cached.key")
      const val3 = await getConfig("cached.key")
      expect(val3).toBe("value2") // fresh from DB
    })

    test("Admin can delete config", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)

      // Create first
      await adminConfigPost(
        new Request("http://localhost/api/admin/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "temp.config", value: "test" }),
        })
      )

      // Delete
      const delReq = new Request("http://localhost/api/admin/config", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "temp.config" }),
      })
      const delRes = await adminConfigDelete(delReq)
      expect(delRes.status).toBe(200)
    })
  })

  // ============================================================================
  // ENTITLEMENT — Plan Types (Phase 5C)
  // ============================================================================
  describe("Entitlement — Plan Types", () => {
    test("resolveEffectivePlan returns free by default", async () => {
      const { resolveEffectivePlan } = await import("@/lib/entitlement")
      const result = await resolveEffectivePlan({ id: IDS.profileA })
      expect(result.plan).toBe("free")
      expect(result.source).toBe("default")
    })

    test("resolveEffectivePlan via license", async () => {
      // Give user A a pro license
      await db.license.create({
        data: {
          userProfileId: IDS.profileA,
          plan: "pro",
          status: "active",
        },
      })

      const { resolveEffectivePlan } = await import("@/lib/entitlement")
      const result = await resolveEffectivePlan({ id: IDS.profileA })
      expect(result.plan).toBe("pro")
      expect(result.source).toBe("license")
      expect(result.licenseId).toBeString()
    })

    test("resolveEffectivePlan via campaign overrides license", async () => {
      // Give user A a plus license
      await db.license.create({
        data: {
          userProfileId: IDS.profileA,
          plan: "plus",
          status: "active",
        },
      })

      // Create a max campaign and assign user
      const campaign = await db.campaign.create({
        data: {
          name: "Max Override",
          plan: "max",
          createdById: IDS.adminC,
        },
      })
      await db.campaignMember.create({
        data: {
          campaignId: campaign.id,
          userProfileId: IDS.profileA,
        },
      })

      const { resolveEffectivePlan } = await import("@/lib/entitlement")
      const result = await resolveEffectivePlan({ id: IDS.profileA })
      expect(result.plan).toBe("max")
      expect(result.source).toBe("campaign")
    })

    test("explainEntitlement produces summary", async () => {
      // Give user B a pro license
      await db.license.create({
        data: {
          userProfileId: IDS.profileB,
          plan: "pro",
          status: "active",
        },
      })

      const { explainEntitlement } = await import("@/lib/entitlement")
      const explanation = await explainEntitlement({ id: IDS.profileB })
      expect(explanation.effectivePlan).toBe("pro")
      expect(explanation.source).toBe("license")
      expect(explanation.summary).toBeString()
      expect(explanation.summary).toContain("Pro")
      expect(explanation.features).toBeArray()
      expect(explanation.features.length).toBeGreaterThan(0)
    })

    test("PLAN_RANK ordering is correct", () => {
      expect(PLAN_RANK.free).toBe(0)
      expect(PLAN_RANK.plus).toBe(1)
      expect(PLAN_RANK.pro).toBe(2)
      expect(PLAN_RANK.max).toBe(3)
    })

    test("PLAN_FEATURES for each tier", () => {

      // Free has no features
      expect(PLAN_FEATURES.free.length).toBe(0)

      // Plus has documents.unlimited + interview.unlimited but NOT visual_cv or english.advanced
      expect(PLAN_FEATURES.plus).toContain("documents.unlimited")
      expect(PLAN_FEATURES.plus).toContain("interview.unlimited")
      expect(PLAN_FEATURES.plus).not.toContain("documents.visual_cv")
      expect(PLAN_FEATURES.plus).not.toContain("english.advanced")

      // Pro has everything except support.premium
      expect(PLAN_FEATURES.pro).toContain("documents.unlimited")
      expect(PLAN_FEATURES.pro).toContain("documents.visual_cv")
      expect(PLAN_FEATURES.pro).toContain("interview.unlimited")
      expect(PLAN_FEATURES.pro).toContain("english.advanced")
      expect(PLAN_FEATURES.pro).toContain("support.priority")
      expect(PLAN_FEATURES.pro).not.toContain("support.premium")

      // Max has everything
      expect(PLAN_FEATURES.max).toContain("documents.unlimited")
      expect(PLAN_FEATURES.max).toContain("documents.visual_cv")
      expect(PLAN_FEATURES.max).toContain("interview.unlimited")
      expect(PLAN_FEATURES.max).toContain("english.advanced")
      expect(PLAN_FEATURES.max).toContain("support.priority")
      expect(PLAN_FEATURES.max).toContain("support.premium")
    })
  })
})
