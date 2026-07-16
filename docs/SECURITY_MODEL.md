# Security Model

Authenticated API routes use `requireActor()`, owner-scoped profile IDs, 404-style foreign-resource handling, CSRF double-submit validation, private no-store responses, server-side role reloads, and rate limiting. JWTs do not carry roles. Private-beta access is checked during signup and login server-side, with indistinguishable invalid-credential responses.
