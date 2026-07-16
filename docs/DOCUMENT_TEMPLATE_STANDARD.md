# Document Template Standard

## ATS CV

- Single column with standard ID/EN headings.
- Arial fallback-safe typography: 20 pt name, 14 pt section headings, 11 pt body, 10 pt contact/date metadata.
- A4 geometry with 0.75-inch margins.
- Contact information remains in the document body.
- Native Word numbering is used; bullet glyphs are not duplicated in text.
- Section headings use `keepNext`; bullets use `keepLines` to reduce orphaning.
- No tables, graphical ratings, fake percentages, or icon-only labels.

## Cover letter, bio, and essay

- Arial 11 pt body, A4 page geometry, 0.787-inch margins.
- Paragraphs use keep-lines behavior and predictable spacing.
- Browser print uses the same persisted text, A4 page rules, visible overflow, heading break guards, and widow/orphan controls.
- Bio has an isolated printable artifact; warnings and editor UI are excluded.

## Preview/export source

Artifact Studio edits the persisted structured JSON consumed by export routes. Initial generations create immutable version 1 for CV, cover letter, bio, and essay. Exports must load an owner-scoped document/version and must not substitute current profile fields for edited artifact content.

## Known limitation

DOCX and browser PDF use different layout engines. Automated structural checks are required, and representative Word/LibreOffice/print rendering remains part of manual release QA.
