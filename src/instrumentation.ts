/**
 * Next.js Instrumentation — runs once at server startup.
 * Validates required environment variables before accepting requests.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/env-validation")
    validateEnv()
  }
}
