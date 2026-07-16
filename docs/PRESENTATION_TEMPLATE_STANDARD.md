# Presentation Template Standard

## Structured source

`src/lib/artifacts/schema.ts` defines `PresentationArtifact`, slide archetypes, blocks, notes, theme controls, locale, audience, objective, and source-evidence metadata. Unknown fields, unsupported blocks, unsafe links, empty slides, and body sizes below 16 pt are rejected.

## Template families

1. Professional Minimal — neutral career default.
2. Editorial Portfolio — expressive project narrative.
3. Formal Institutional — academic, government, scholarship, and organization use.
4. Modern Technical — engineering, product, data, and software portfolios.

Each family defines fallback-safe fonts, light/dark palettes, grid margins, gutters, surfaces, rules, and accents. Templates remain switchable after generation.

## Type and layout floors

- Cover title: 36–42 pt.
- Slide title: 26–30 pt.
- Lead text: 18–25 pt.
- Body: 16–20 pt.
- Caption/footer: 9–13 pt and never used for primary content.

Content is shortened, grouped, or split before primary body text is reduced. Timeline, matrix, case-study, statement, education, and contact layouts have bounded item counts and fixed safe margins.

## Narrative rules

The engine selects slides from available evidence instead of filling a six-slide template. The default arc is positioning, value, journey, capabilities, selected case studies, learning foundation, and a concrete close. Empty agenda/project sections are omitted. No metrics, projects, employers, skills, or outcomes may be invented.

Editor-only unfinished slides remain hidden and are removed by `exportablePresentation()`.
