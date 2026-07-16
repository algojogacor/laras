import type { PresentationArtifact } from "@/lib/artifacts/schema"

export type ArtifactTemplate = {
  id: PresentationArtifact["theme"]["family"]
  name: { id: string; en: string }
  description: { id: string; en: string }
  fonts: { heading: string; body: string }
  light: { background: string; surface: string; ink: string; muted: string; accent: string; line: string }
  dark: { background: string; surface: string; ink: string; muted: string; accent: string; line: string }
  grid: { marginX: number; marginTop: number; marginBottom: number; gutter: number }
  radius: number
}

export const ARTIFACT_TEMPLATES: ArtifactTemplate[] = [
  { id: "professional-minimal", name: { id: "Profesional Minimal", en: "Professional Minimal" }, description: { id: "Netral, jelas, dan kuat untuk sebagian besar kebutuhan karier.", en: "Neutral, clear, and strong for most career contexts." }, fonts: { heading: "Aptos Display", body: "Aptos" }, light: { background: "F7F8FA", surface: "FFFFFF", ink: "17202A", muted: "5B6672", accent: "2563EB", line: "D9DEE5" }, dark: { background: "111827", surface: "1F2937", ink: "F9FAFB", muted: "C7CED8", accent: "60A5FA", line: "374151" }, grid: { marginX: 0.72, marginTop: 0.55, marginBottom: 0.48, gutter: 0.34 }, radius: 0.08 },
  { id: "editorial-portfolio", name: { id: "Portofolio Editorial", en: "Editorial Portfolio" }, description: { id: "Hierarki ekspresif untuk narasi proyek dan karya.", en: "Expressive hierarchy for project and work narratives." }, fonts: { heading: "Georgia", body: "Aptos" }, light: { background: "F7F2E8", surface: "FFFDF8", ink: "2A211B", muted: "6F6258", accent: "B45309", line: "DED3C4" }, dark: { background: "241B17", surface: "342720", ink: "FFF8EC", muted: "D8C9BA", accent: "F59E0B", line: "5B4639" }, grid: { marginX: 0.8, marginTop: 0.5, marginBottom: 0.55, gutter: 0.42 }, radius: 0 },
  { id: "formal-institutional", name: { id: "Formal Institusional", en: "Formal Institutional" }, description: { id: "Untuk akademik, pemerintahan, beasiswa, dan organisasi.", en: "For academic, government, scholarship, and organizational contexts." }, fonts: { heading: "Cambria", body: "Arial" }, light: { background: "F9FAF7", surface: "FFFFFF", ink: "1E2B23", muted: "59685E", accent: "1F6B4F", line: "CFD8D1" }, dark: { background: "17221C", surface: "223128", ink: "F6FAF7", muted: "C3CEC6", accent: "6EE7B7", line: "3F5146" }, grid: { marginX: 0.78, marginTop: 0.55, marginBottom: 0.52, gutter: 0.38 }, radius: 0.04 },
  { id: "modern-technical", name: { id: "Teknis Modern", en: "Modern Technical" }, description: { id: "Presisi dan terstruktur untuk engineering, data, dan produk.", en: "Precise and structured for engineering, data, and product." }, fonts: { heading: "Aptos Display", body: "Arial" }, light: { background: "F4F7FA", surface: "FFFFFF", ink: "102133", muted: "53677B", accent: "0E7490", line: "CBD8E3" }, dark: { background: "0B1724", surface: "122538", ink: "F1F7FA", muted: "B7C8D5", accent: "22D3EE", line: "29445A" }, grid: { marginX: 0.7, marginTop: 0.5, marginBottom: 0.45, gutter: 0.3 }, radius: 0.06 },
]

export function getArtifactTemplate(theme: PresentationArtifact["theme"]) {
  const template = ARTIFACT_TEMPLATES.find((item) => item.id === theme.family) || ARTIFACT_TEMPLATES[0]
  const colors = theme.variant === "dark" ? template.dark : template.light
  return { ...template, colors: { ...colors, accent: theme.accent || colors.accent } }
}
