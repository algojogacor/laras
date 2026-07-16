# AI Artifact Editing

Contextual editing is a proposal workflow, never an immediate overwrite.

1. The user selects a supported string field.
2. The client submits its bounded path, exact selected text, named action, and optional instruction.
3. The server verifies the selected text still matches the owner-scoped current document.
4. Only the selection and minimum supplied context are sent to the AI provider.
5. Strict Zod output returns replacement text, warnings, and unsupported claims.
6. New numeric claims and reported unsupported claims fail closed.
7. A `RevisionRequest` stores the preview, diff, action, and base version.
8. Accept revalidates source hash, path, document schema, ownership, and version in one transaction; reject changes no document data.

Accepted edits create a named immutable `DocumentVersion`. Exact restore copies stored JSON and never calls AI. Stale proposals return conflict instead of overwriting another tab.

Prompts must not contain secrets, hidden chain-of-thought, unrelated profile fields, or private data outside the authorized selection. The provider is instructed never to invent metrics, employers, projects, dates, skills, or achievements.
