import { describe, expect, test } from "bun:test"
import { applyArtifactPatch, createArtifactDiff, validateDocumentContent } from "@/lib/artifacts/editing"
import { buildPresentationArtifact } from "@/lib/artifacts/presentation-engine"
import { artifactFixtures } from "@/lib/artifacts/fixtures"

describe("artifact editing safeguards", () => {
  test("creates a bounded diff and applies only when the selected source still matches", () => {
    const source = buildPresentationArtifact(artifactFixtures["software-engineer"])
    const path = ["slides", 0, "title"] as const
    const before = source.slides[0].title
    const diff = createArtifactDiff(path, before, "Arif Pratama - Product Engineering")
    const next = applyArtifactPatch(source, diff)
    expect(next.slides[0].title).toBe("Arif Pratama - Product Engineering")
    expect(() => applyArtifactPatch(next, diff)).toThrow("stale-selection")
  })

  test("rejects prototype paths and invalid document output", () => {
    const source = buildPresentationArtifact(artifactFixtures["technical-project"])
    expect(() => applyArtifactPatch(source, createArtifactDiff(["__proto__", "polluted"], "", "yes"))).toThrow("unsafe-path")
    expect(() => validateDocumentContent("deck", { ...source, slides: [] })).toThrow()
  })
})
