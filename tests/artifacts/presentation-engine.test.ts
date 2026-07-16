import { describe, expect, test } from "bun:test"
import { buildPresentationArtifact, inspectPresentationQuality } from "@/lib/artifacts/presentation-engine"
import { artifactFixtures } from "@/lib/artifacts/fixtures"
import { presentationArtifactSchema } from "@/lib/artifacts/schema"

describe("content-aware presentation engine", () => {
  test.each(["indonesian-law-student", "software-engineer", "technical-project", "academic-presentation"] as const)(
    "builds a valid, localized artifact for %s",
    (fixtureId) => {
      const artifact = buildPresentationArtifact(artifactFixtures[fixtureId])
      expect(presentationArtifactSchema.parse(artifact)).toEqual(artifact)
      expect(artifact.schemaVersion).toBe(1)
      expect(artifact.slides.length).toBeGreaterThanOrEqual(5)
      expect(artifact.slides.every((slide) => slide.title.trim().length > 0)).toBe(true)
    },
  )

  test("adapts narrative and does not emit empty template sections", () => {
    const artifact = buildPresentationArtifact(artifactFixtures["indonesian-law-student"])
    const types = artifact.slides.map((slide) => slide.type)
    expect(types).toContain("timeline")
    expect(types).toContain("skills-matrix")
    expect(types).toContain("case-study")
    expect(types).not.toContain("agenda")
  })

  test("passes structural quality gates and strips editor-only placeholders from export", () => {
    const artifact = buildPresentationArtifact(artifactFixtures["software-engineer"])
    const report = inspectPresentationQuality(artifact)
    expect(report.errors).toEqual([])
    expect(JSON.stringify(artifact)).not.toContain("Tambahkan hasil atau dampak proyek")
    expect(report.minimumBodyFontPt).toBeGreaterThanOrEqual(16)
  })

  test("contains no internal profile or database IDs", () => {
    const artifact = buildPresentationArtifact(artifactFixtures["technical-project"])
    expect(JSON.stringify(artifact)).not.toContain("fixture-")
    expect(JSON.stringify(artifact)).not.toContain("exp-")
  })
})
