import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { artifactFixtures } from "@/lib/artifacts/fixtures"
import { buildPresentationArtifact } from "@/lib/artifacts/presentation-engine"
import { buildPresentationDeck } from "@/lib/deck-renderer"
import { buildCVATSDocx, packDocx as packCv } from "@/lib/docx-renderer"
import { buildTextDocx, packDocx as packText } from "@/lib/text-docx"

const output = process.env.ARTIFACT_FIXTURE_DIR || join(tmpdir(), "laras-artifact-fixtures")
await mkdir(output, { recursive: true })
const manifest: Array<{ fixture: string; file: string; bytes: number }> = []
async function write(fixture: string, file: string, data: Buffer) { await Bun.write(join(output, file), data); manifest.push({ fixture, file, bytes: data.byteLength }) }
function cvFor(key: "fresh-graduate-cv" | "experienced-professional-cv") { const fixture = artifactFixtures[key]; return { fixture, cv: { headline: fixture.profile.headline || "", summary: fixture.profile.summary || "", skillsByCategory: [{ category: fixture.locale === "id" ? "Keahlian" : "Skills", items: fixture.profile.skills.map((skill) => skill.name) }], experiences: fixture.profile.experiences.map((experience) => ({ experienceId: experience.id, bullets: (experience.achievements as unknown as string[]).map((text) => ({ text, hasEvidence: /\d/.test(text), evidenceType: /\d/.test(text) ? "metric" as const : "none" as const })) })), warnings: [] } } }

for (const key of ["indonesian-law-student", "software-engineer", "technical-project", "academic-presentation"] as const) await write(key, `${key}.pptx`, await buildPresentationDeck(buildPresentationArtifact(artifactFixtures[key])))
for (const key of ["fresh-graduate-cv", "experienced-professional-cv"] as const) { const { fixture, cv } = cvFor(key); await write(key, `${key}.docx`, await packCv(buildCVATSDocx(fixture.profile, cv, fixture.locale))) }
const scholarship = artifactFixtures["scholarship-cover-letter"]
await write("scholarship-cover-letter", "scholarship-cover-letter.docx", await packText(buildTextDocx(scholarship.profile, { title: "Surat Motivasi Beasiswa", paragraphs: [scholarship.profile.summary || "", scholarship.profile.experiences[0]?.contextNotes || "", (scholarship.profile.experiences[0]?.achievements as unknown as string[]).join(" ")], signOff: "Hormat saya," })))
const odp = artifactFixtures["odp-application-essay"]
await write("odp-application-essay", "odp-application-essay.docx", await packText(buildTextDocx(odp.profile, { title: "Esai Aplikasi ODP", paragraphs: [odp.profile.summary || "", odp.profile.experiences[0]?.contextNotes || "", (odp.profile.experiences[0]?.achievements as unknown as string[]).join(" ")] })))
await Bun.write(join(output, "manifest.json"), JSON.stringify({ generatedAt: "deterministic-fixture-set-v1", artifacts: manifest }, null, 2))
console.log(JSON.stringify({ output, artifacts: manifest.length, manifest }))
