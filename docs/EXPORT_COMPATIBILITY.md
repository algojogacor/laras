# Export Compatibility

| Format | Source | Current guarantee | Required manual check |
|---|---|---|---|
| PPTX | `PresentationArtifact` exact durable version | PptxGenJS 4, 16:9, notes, masters, four themes, private/no-store, export audit with checksum | PowerPoint and LibreOffice Impress rendering |
| DOCX ATS CV | Persisted generated CV JSON + owner profile contact/education source | Native headings/numbering, A4, Arial, single column | Word and LibreOffice Writer pagination |
| DOCX text documents | Persisted cover-letter/bio/essay JSON | A4, Arial, paragraph spacing and keep-lines | Word and LibreOffice Writer pagination |
| PDF/print | Persisted browser preview | A4 print rules, isolated print area, overflow and orphan guards | Chromium print at desktop/mobile |
| HTML preview | Persisted current draft | Same structured text and template selection used by export | Font fallback and responsive behavior |

PPTX exports initiated by Studio use a CSRF-protected POST and create `ArtifactExport` records containing document, exact version, format, checksum, and timestamp. Compatibility GET exports remain read-only. Every successful response includes `X-Artifact-Version`.

Fallback fonts are Aptos/Arial/Cambria/Georgia families commonly available on Office platforms. Exporters must not depend on repository-local fonts. Font substitution may still differ on macOS or LibreOffice and is therefore explicitly part of visual QA.
