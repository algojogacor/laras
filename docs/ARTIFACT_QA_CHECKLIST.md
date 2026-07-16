# Artifact QA Checklist

## Automated

- Schema rejects unknown fields, unsupported blocks, unsafe URLs, and empty slides.
- Presentation fixtures have at least five evidence-backed slides and no unintended template sections.
- Minimum primary body size is 16 pt.
- Hidden editor placeholders are not exported.
- No internal profile/database IDs serialize into presentation content.
- PPTX ZIP contains the expected slide count, notes, fixture canaries, and no unfinished placeholder.
- ATS DOCX uses native numbering and localized headings without duplicate bullet glyphs.
- Autosave uses optimistic concurrency; AI patch source hashes prevent stale acceptance.
- Initial generation, accepted AI edits, manual checkpoints, and restores create immutable versions.

## Manual rendering

For every release candidate, render the eight fixtures in `src/lib/artifacts/fixtures.ts`.

1. Open PPTX in current Microsoft PowerPoint and LibreOffice Impress.
2. Inspect every slide at full size for clipping, overlap, wrapping, substitution, notes, and alignment.
3. Open DOCX in Word and LibreOffice Writer; inspect every page at 100%.
4. Print each HTML preview to PDF in Chromium at desktop and 375 px viewport.
5. Compare source text, section order, locale, template, and version marker across preview/export.
6. Verify hidden slides/sections and editor placeholders are absent.
7. Verify long-name, long-organization, many-skills, empty-optional-field, and two-page cases.

PowerPoint rendering is available on the current Windows machine through Office automation. LibreOffice/Impress parity remains a separate manual check when `soffice` is unavailable.
