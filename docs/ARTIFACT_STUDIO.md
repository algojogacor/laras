# Artifact Studio

Artifact Studio is Laras's unified editor for persisted CVs, cover letters, bios, essays, and presentations. The primary route is `/documents/[id]/studio`; the documents list opens saved artifacts there.

## Editing model

- `Document.content` is the current autosaved draft.
- `Document.updatedAt` is the optimistic-concurrency token for debounced draft saves.
- `Document.version` identifies the latest durable checkpoint.
- `DocumentVersion` is immutable. Manual checkpoints, accepted AI changes, exact restores, and initial generation create versions.
- Undo/redo is immediate client state. The browser keeps an unsaved draft until the server confirms the save.

Presentations use `PresentationArtifact` schema version 1 directly. Existing CV, cover-letter, bio, and essay JSON remains backward compatible and is exposed as editable fields through type adapters.

## Studio capabilities

- Shared outline, edit, preview, appearance, history, and export surfaces.
- Direct text/bullet/paragraph editing.
- Presentation slide reorder, duplicate, delete, hide/restore, and add-hidden-slide flow.
- Four switchable template families and light/dark variants.
- Debounced autosave with visible saved/saving/conflict state.
- Local undo/redo, durable checkpoints, version comparison, and reversible exact restore.
- Contextual AI proposal with before/after, accept, and reject.
- Mobile tab layout; all reorder operations have keyboard-accessible buttons.

## Conflict behavior

Draft saves require the `updatedAt` value loaded by the editor. Stale saves return HTTP 409 and do not overwrite the newer draft. AI proposals also store their base durable version; stale proposals cannot be accepted.

## Legacy migration

Existing document JSON is not silently rewritten. Presentation export accepts only schema-versioned presentation content. Deck creation persists version 1 before Studio opens; read-only GET exports never create data, while the CSRF-protected Studio POST records the exact exported version and checksum.
