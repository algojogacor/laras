import { describe, expect, test } from "bun:test"
import { presentationArtifactSchema } from "@/lib/artifacts/schema"

describe("artifact schema", () => {
  test("rejects unknown blocks, unsafe URLs, and unknown fields", () => {
    const base = {
      schemaVersion: 1, kind: "presentation", title: "Portfolio", locale: "id", audience: "recruiter",
      objective: "Introduce evidence", theme: { family: "professional-minimal", variant: "light", density: "comfortable", alignment: "start" },
      slides: [{ id: "slide-1", type: "closing", title: "Mari terhubung", blocks: [], notes: "", layoutPreference: "statement", visualPriority: "content" }],
      sourceEvidence: [],
    }
    expect(() => presentationArtifactSchema.parse({ ...base, secret: true })).toThrow()
    expect(() => presentationArtifactSchema.parse({ ...base, slides: [{ ...base.slides[0], blocks: [{ id: "b1", type: "unknown" }] }] })).toThrow()
    expect(() => presentationArtifactSchema.parse({ ...base, slides: [{ ...base.slides[0], blocks: [{ id: "b1", type: "link", label: "x", url: "javascript:alert(1)" }] }] })).toThrow()
  })
})
