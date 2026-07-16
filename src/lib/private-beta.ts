import "server-only"

/**
 * Small, reversible gate for trusted-user beta releases.
 *
 * Local development stays open unless explicitly enabled. Production fails
 * closed when PRIVATE_BETA_MODE is enabled and no allowlist is configured.
 */
export function isPrivateBetaEnabled(): boolean {
  const configured = process.env.PRIVATE_BETA_MODE?.trim().toLowerCase()
  if (configured === "false" || configured === "0" || configured === "off") return false
  if (configured === "true" || configured === "1" || configured === "on") return true
  return process.env.NODE_ENV === "production"
}

function allowedEmails(): Set<string> {
  return new Set(
    (process.env.PRIVATE_BETA_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function isBetaEmailAllowed(email: string): boolean {
  if (!isPrivateBetaEnabled()) return true
  const normalized = email.trim().toLowerCase()
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase()
  return normalized === owner || allowedEmails().has(normalized)
}

export function isBetaConfigSafe(): boolean {
  return !isPrivateBetaEnabled() || allowedEmails().size > 0 || Boolean(process.env.OWNER_EMAIL?.trim())
}
