/**
 * Startup environment variable validation.
 *
 * Validates required and optional env vars at application startup.
 * Does NOT expose values — only presence is checked.
 *
 * Call validateEnv() early in the app lifecycle (e.g., instrumentation.ts
 * or the first API handler). On missing required vars, it throws; on missing
 * optional vars, it warns.
 *
 * Optional integrations (Supabase, DeepSeek AI, Turso) must NOT prevent
 * local development from starting. Their absence produces warnings, not
 * fatal errors.
 */

interface ValidationResult {
  valid: boolean
  missing: string[]
  warnings: string[]
}

const REQUIRED = [
  "AUTH_SECRET",
  "DATABASE_URL",
] as const

const OPTIONAL = [
  // Supabase Storage — needed for file uploads (profile photos, exports, audio)
  "NEXT_PUBLIC_SUPABASE_URL",
  // DeepSeek AI — needed for CV, cover letter, essays, interview, English, listening
  "DEEPSEEK_API_KEY",
  // Turso/libSQL — alternative to local SQLite for production
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
] as const

/**
 * Feature-specific optional variables.
 * Missing these disables specific features but does not block startup.
 */
const FEATURE_OPTIONAL = [
  "SUPABASE_SECRET_KEY",        // server-side Supabase operations (uploads, signed URLs)
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", // browser Supabase client
  "DEEPSEEK_BASE_URL",          // override default https://api.deepseek.com
] as const

/**
 * Validate that required environment variables are set.
 *
 * @throws Error if any required vars are missing
 * @returns ValidationResult with warnings for missing optional vars
 */
export function validateEnv(): ValidationResult {
  const missing: string[] = []
  const warnings: string[] = []

  for (const key of REQUIRED) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  for (const key of OPTIONAL) {
    if (!process.env[key]) {
      warnings.push(key)
    }
  }

  for (const key of FEATURE_OPTIONAL) {
    if (!process.env[key]) {
      // Feature-optional vars are informational only — don't warn loudly
      // unless their parent integration appears configured.
      if (key === "SUPABASE_SECRET_KEY" && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        warnings.push(`${key} (Supabase URL is set but server secret key is missing)`)
      } else if (key === "DEEPSEEK_BASE_URL") {
        // Base URL has a sensible default — never warn
      }
    }
  }

  if (missing.length > 0) {
    const msg = `Missing required environment variables: ${missing.join(", ")}`
    console.error(`[env] FATAL: ${msg}`)
    throw new Error(msg)
  }

  if (warnings.length > 0) {
    console.warn(
      `[env] WARNING: Missing optional environment variables: ${warnings.join(", ")}`
    )
    // Provide actionable guidance
    if (warnings.some((w) => w.includes("DEEPSEEK_API_KEY"))) {
      console.warn(
        "[env]   → AI features (CV generation, cover letters, essays, interviews, English practice, listening) will not work."
      )
      console.warn(
        "[env]   → Set DEEPSEEK_API_KEY to enable AI features. Get a key at https://platform.deepseek.com/"
      )
    }
    if (warnings.some((w) => w.includes("NEXT_PUBLIC_SUPABASE_URL"))) {
      console.warn(
        "[env]   → File uploads (profile photos, exports, audio) will use local storage fallback."
      )
    }
    if (warnings.some((w) => w.includes("TURSO"))) {
      console.warn(
        "[env]   → Using local SQLite. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN for production."
      )
    }
  } else {
    console.log("[env] All required and optional environment variables are set.")
  }

  return {
    valid: true,
    missing, // always empty if we reach here
    warnings,
  }
}

/**
 * Check if a specific env var is set (without exposing its value).
 */
export function hasEnvVar(key: string): boolean {
  return typeof process.env[key] === "string" && process.env[key]!.length > 0
}

/**
 * Check if a feature that requires an optional env var is usable.
 * Returns true if the var is set and non-empty.
 */
export function isFeatureAvailable(key: string): boolean {
  return hasEnvVar(key)
}
