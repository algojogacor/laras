# Deployment Runbook

1. Configure production secrets without committing them: `AUTH_SECRET`, `DATABASE_URL`, `PRIVATE_BETA_MODE=true`, `PRIVATE_BETA_EMAILS`, and required integration keys.
2. Run the release checklist in a disposable environment.
3. Build with `bun run build` and start the standalone server with `bun start`.
4. Verify health, login, signup allowlisting, one core document flow, opportunity creation, and logout.
5. Deploy only to the approved upgrade branch; never force-push or push remote `main`.
