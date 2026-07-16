/// <reference types="bun-types" />
import { beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { db } from "@/lib/db"
import { createSessionToken } from "@/lib/auth"
import { buildPresentationArtifact } from "@/lib/artifacts/presentation-engine"
import { artifactFixtures } from "@/lib/artifacts/fixtures"
import { cleanDb, seedDb, IDS } from "./fixtures"
import { resetTestRuntime, testRuntime } from "./test-runtime"

let artifactGet: any, artifactPatch: any, checkpointPost: any, restorePost: any, proposalPatch: any, deckExportGet: any, deckExportPost: any
const params = (id: string) => Promise.resolve({ id })

describe("Artifact Studio authorization and version safety", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-key-32-chars-long-or-more"
    const artifactRoute = await import("@/app/api/artifacts/[id]/route"); artifactGet = artifactRoute.GET; artifactPatch = artifactRoute.PATCH
    checkpointPost = (await import("@/app/api/artifacts/[id]/versions/route")).POST
    restorePost = (await import("@/app/api/artifacts/[id]/versions/[versionId]/restore/route")).POST
    proposalPatch = (await import("@/app/api/artifacts/[id]/ai/proposals/[proposalId]/route")).PATCH
    const deckExportRoute = await import("@/app/api/documents/deck/export/route"); deckExportGet = deckExportRoute.GET; deckExportPost = deckExportRoute.POST
  })
  beforeEach(async () => { resetTestRuntime(); await cleanDb(); await seedDb() })

  async function createDeck(profileId = IDS.profileA) {
    const content = JSON.stringify(buildPresentationArtifact(artifactFixtures["software-engineer"])), config = JSON.stringify({ template: "modern-technical" })
    const doc = await db.document.create({ data: { userProfileId: profileId, type: "deck", title: "Artifact Test", content, config, version: 1 } })
    const version = await db.documentVersion.create({ data: { documentId: doc.id, versionNumber: 1, content, configSnapshot: config } })
    return { doc, version, content, config }
  }

  test("owner can load Studio while a foreign user receives safe 404", async () => {
    const { doc } = await createDeck()
    testRuntime.cookieValue = await createSessionToken(IDS.accountA)
    expect((await artifactGet(new Request(`http://localhost/api/artifacts/${doc.id}`), { params: params(doc.id) })).status).toBe(200)
    testRuntime.cookieValue = await createSessionToken(IDS.accountB)
    expect((await artifactGet(new Request(`http://localhost/api/artifacts/${doc.id}`), { params: params(doc.id) })).status).toBe(404)
  })

  test("autosave rejects stale updatedAt instead of overwriting", async () => {
    const { doc } = await createDeck(); testRuntime.cookieValue = await createSessionToken(IDS.accountA)
    const current = await db.document.findUniqueOrThrow({ where: { id: doc.id } }), content = JSON.parse(current.content!)
    content.title = "First autosave"
    const first = await artifactPatch(new Request(`http://localhost/api/artifacts/${doc.id}`, { method: "PATCH", body: JSON.stringify({ expectedUpdatedAt: current.updatedAt.toISOString(), content }) }), { params: params(doc.id) })
    expect(first.status).toBe(200)
    content.title = "Stale overwrite"
    const stale = await artifactPatch(new Request(`http://localhost/api/artifacts/${doc.id}`, { method: "PATCH", body: JSON.stringify({ expectedUpdatedAt: current.updatedAt.toISOString(), content }) }), { params: params(doc.id) })
    expect(stale.status).toBe(409)
    expect(JSON.parse((await db.document.findUniqueOrThrow({ where: { id: doc.id } })).content!).title).toBe("First autosave")
  })

  test("manual checkpoint creates one immutable next version", async () => {
    const { doc } = await createDeck(); testRuntime.cookieValue = await createSessionToken(IDS.accountA)
    const response = await checkpointPost(new Request(`http://localhost/api/artifacts/${doc.id}/versions`, { method: "POST", body: JSON.stringify({ expectedVersion: 1, label: "Reviewed copy" }) }), { params: params(doc.id) })
    expect(response.status).toBe(201)
    expect((await db.documentVersion.findMany({ where: { documentId: doc.id }, orderBy: { versionNumber: "asc" } })).map((item) => item.versionNumber)).toEqual([1, 2])
  })

  test("simultaneous checkpoints cannot create duplicate version numbers", async () => {
    const { doc } = await createDeck(); testRuntime.cookieValue = await createSessionToken(IDS.accountA)
    const request = () => checkpointPost(new Request(`http://localhost/api/artifacts/${doc.id}/versions`, { method: "POST", body: JSON.stringify({ expectedVersion: 1, label: "Concurrent checkpoint" }) }), { params: params(doc.id) })
    const responses = await Promise.all([request(), request()])
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409])
    expect((await db.documentVersion.findMany({ where: { documentId: doc.id } })).map((item) => item.versionNumber).sort()).toEqual([1, 2])
  })

  test("restore copies exact historical JSON into a new reversible version", async () => {
    const { doc, version, content } = await createDeck(); testRuntime.cookieValue = await createSessionToken(IDS.accountA)
    await db.document.update({ where: { id: doc.id }, data: { content: JSON.stringify({ changed: true }), version: 2 } })
    await db.documentVersion.create({ data: { documentId: doc.id, versionNumber: 2, content: JSON.stringify({ changed: true }), configSnapshot: "{}" } })
    const response = await restorePost(new Request("http://localhost/restore", { method: "POST", body: JSON.stringify({ expectedVersion: 2 }) }), { params: Promise.resolve({ id: doc.id, versionId: version.id }) })
    expect(response.status).toBe(200)
    const restored = await db.document.findUniqueOrThrow({ where: { id: doc.id } })
    expect(restored.version).toBe(3); expect(restored.content).toBe(content)
  })

  test("rejecting an AI proposal changes no document content or version", async () => {
    const { doc, content } = await createDeck(); testRuntime.cookieValue = await createSessionToken(IDS.accountA)
    const proposal = await db.revisionRequest.create({ data: { documentId: doc.id, instruction: "shorten", status: "preview", proposedContent: JSON.stringify({}), baseVersion: 1 } })
    const response = await proposalPatch(new Request("http://localhost/proposal", { method: "PATCH", body: JSON.stringify({ decision: "reject", expectedVersion: 1 }) }), { params: Promise.resolve({ id: doc.id, proposalId: proposal.id }) })
    expect(response.status).toBe(200)
    const unchanged = await db.document.findUniqueOrThrow({ where: { id: doc.id } })
    expect(unchanged.content).toBe(content); expect(unchanged.version).toBe(1)
    expect((await db.revisionRequest.findUniqueOrThrow({ where: { id: proposal.id } })).status).toBe("rejected")
  })

  test("GET export is read-only while owner POST records the exact version export", async () => {
    const { doc } = await createDeck(); testRuntime.cookieValue = await createSessionToken(IDS.accountA)
    const url = `http://localhost/api/documents/deck/export?documentId=${doc.id}&version=1`
    const readOnly = await deckExportGet(new Request(url))
    expect(readOnly.status).toBe(200)
    expect(readOnly.headers.get("X-Artifact-Version")).toBe("1")
    expect(await db.artifactExport.count({ where: { documentId: doc.id } })).toBe(0)

    const recorded = await deckExportPost(new Request(url, { method: "POST" }))
    expect(recorded.status).toBe(200)
    expect(await db.artifactExport.count({ where: { documentId: doc.id, format: "pptx" } })).toBe(1)

    testRuntime.cookieValue = await createSessionToken(IDS.accountB)
    expect((await deckExportPost(new Request(url, { method: "POST" }))).status).toBe(404)
  })
})
