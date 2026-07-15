/**
 * Startup environment variable validation.
 *
 * Validates required and optional env vars at application startup.
 * Does NOT expose values — only presence is checked.
 *
 * Call validateEnv() early in the app lifecycle (e.g., instrumentation.ts
 * or the first API handler). On missing required vars, it throws; on missing
 * optional vars, it warns.
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
  "SUPABASE_URL",
  "ZAI_API_KEY",
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
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

  if (missing.length > 0) {
    const msg = `Missing required environment variables: ${missing.join(", ")}`
    console.error(`[env] FATAL: ${msg}`)
    throw new Error(msg)
  }

  if (warnings.length > 0) {
    console.warn(
      `[env] WARNING: Missing optional environment variables: ${warnings.join(", ")}`
    )
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
