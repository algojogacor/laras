/**
 * Runtime environment validation.
 * Fails fast with a clear message when a required variable is missing.
 * Optional variables are tolerated (features degrade gracefully).
 */

export type EnvSpec = {
  name: string
  required: boolean
  description: string
}

const SPECS: EnvSpec[] = [
  // Database (Turso/libSQL)
  { name: "TURSO_DATABASE_URL", required: true, description: "Turso/libSQL database URL (libsql://...)" },
  { name: "TURSO_AUTH_TOKEN", required: true, description: "Turso auth token" },
  { name: "DATABASE_URL", required: false, description: "Fallback DB URL; Turso is preferred" },
  // Auth
  { name: "AUTH_SECRET", required: true, description: "HS256 signing secret for session JWTs" },
  // AI (auto-resolved by z-ai-web-dev-sdk in most sandboxes; set explicitly if needed)
  { name: "ZAI_API_KEY", required: false, description: "Z.ai API key (optional; SDK auto-resolves)" },
  // Supabase Storage (optional)
  { name: "NEXT_PUBLIC_SUPABASE_URL", required: false, description: "Supabase project URL (Storage)" },
  { name: "SUPABASE_SECRET_KEY", required: false, description: "Supabase service-role key (Storage)" },
]

let _checked = false
let _missing: string[] = []

/** Validate env once. Returns the list of missing required vars (empty if OK). */
export function getMissingEnv(): string[] {
  if (_checked) return _missing
  _missing = SPECS.filter((s) => s.required && !process.env[s.name]).map((s) => s.name)
  _checked = true
  return _missing
}

/** Throw if required env vars are missing. Call at startup of critical paths. */
export function assertEnv(label = "server"): void {
  const missing = getMissingEnv()
  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required environment variables for ${label}: ${missing.join(", ")}. ` +
        `See .env.example for the full list.`
    )
  }
}

/** True if the AI/LLM service is likely available. */
export function hasAI(): boolean {
  // The z-ai-web-dev-sdk auto-resolves its key in managed sandboxes, so we
  // treat AI as available unless explicitly disabled. Set ZAI_API_KEY="" to opt out.
  return process.env.ZAI_API_KEY !== ""
}
