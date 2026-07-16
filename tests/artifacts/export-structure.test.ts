import { describe, expect, test } from "bun:test"
import JSZip from "jszip"
import { buildPresentationDeck } from "@/lib/deck-renderer"
import { buildPresentationArtifact } from "@/lib/artifacts/presentation-engine"
import { artifactFixtures } from "@/lib/artifacts/fixtures"
import { buildCVATSDocx, packDocx } from "@/lib/docx-renderer"

describe("artifact export structure", () => {
  test("PPTX contains every content-aware slide, notes, and no unfinished placeholder", async () => {
    const artifact = buildPresentationArtifact(artifactFixtures["indonesian-law-student"])
    const buffer = await buildPresentationDeck(artifact)
    const zip = await JSZip.loadAsync(buffer)
    const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    expect(slideFiles).toHaveLength(artifact.slides.length)
    const xml = (await Promise.all(slideFiles.map((name) => zip.file(name)!.async("string")))).join("\n")
    expect(xml).toContain("Nadya Putri Rahma")
    expect(xml).not.toContain("Tambahkan hasil atau dampak proyek")
    expect(Object.keys(zip.files).some((name) => name.startsWith("ppt/notesSlides/notesSlide"))).toBe(true)
  })

  test("ATS DOCX uses native numbering and does not duplicate a literal bullet", async () => {
    const fixture = artifactFixtures["fresh-graduate-cv"]
    const cv = { headline: fixture.profile.headline || "", summary: fixture.profile.summary || "", skillsByCategory: [{ category: "Skills", items: fixture.profile.skills.map((skill) => skill.name) }], experiences: fixture.profile.experiences.map((experience) => ({ experienceId: experience.id, bullets: (experience.achievements as unknown as string[]).map((text) => ({ text, hasEvidence: true, evidenceType: "metric" as const })) })), warnings: [] }
    const buffer = await packDocx(buildCVATSDocx(fixture.profile, cv, "id"))
    const zip = await JSZip.loadAsync(buffer), documentXml = await zip.file("word/document.xml")!.async("string")
    expect(documentXml).toContain("<w:numPr>")
    expect(documentXml).not.toContain("• ")
    expect(documentXml).toContain("RINGKASAN")
  })
})
