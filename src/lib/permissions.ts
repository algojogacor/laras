import "server-only"
import { db } from "@/lib/db"
import { AuthorizationError } from "@/lib/authorization"
import type { ActorContext } from "@/lib/authorization"

// ============================================================================
// CAPABILITY CONSTANTS — Phase 4A
// ============================================================================

export const CAPABILITIES = {
  // User management
  USERS_READ: "users.read",
  USERS_WRITE: "users.write",

  // Role governance (owner-only)
  ROLES_MANAGE: "roles.manage",

  // Moderation
  MODERATION_CASES_READ: "moderation.cases.read",
  MODERATION_CASES_MANAGE: "moderation.cases.manage",
  MODERATION_APPEALS_READ: "moderation.appeals.read",
  MODERATION_APPEALS_MANAGE: "moderation.appeals.manage",

  // Announcements
  ANNOUNCEMENTS_MANAGE: "announcements.manage",

  // Licenses & entitlements
  LICENSES_MANAGE: "licenses.manage",

  // Verification
  VERIFICATION_MANAGE: "verification.manage",

  // Audit
  AUDIT_READ: "audit.read",

  // Configuration
  CONFIG_READ: "config.read",
  CONFIG_WRITE: "config.write",

  // Campaigns & codes
  CAMPAIGNS_MANAGE: "campaigns.manage",
  CODES_GENERATE: "codes.generate",

  // Search
  SEARCH_ADMIN: "search.admin",

  // Analytics
  ANALYTICS_READ: "analytics.read",

  // Account suspension
  ACCOUNTS_SUSPEND: "accounts.suspend",
  ACCOUNTS_DELETE: "accounts.delete",

  // Content
  CONTENT_REVIEW: "content.review",
  CONTENT_PUBLISH: "content.publish",

  // System
  SYSTEM_HEALTH: "system.health",
  SYSTEM_MAINTENANCE: "system.maintenance",
} as const

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES]

/** All capability strings in a flat readonly array. */
export const ALL_CAPABILITIES: readonly string[] = Object.values(CAPABILITIES)

// ============================================================================
// DEFAULT ROLE-TO-CAPABILITY MAPPING — Phase 4A
// ============================================================================

/**
 * Owner capabilities: every defined capability.
 */
const OWNER_CAPABILITIES: ReadonlySet<string> = new Set(ALL_CAPABILITIES)

/**
 * Admin capabilities: most administrative operations, excluding owner-only.
 */
const ADMIN_CAPABILITIES: ReadonlySet<string> = new Set([
  CAPABILITIES.USERS_READ,
  CAPABILITIES.USERS_WRITE,
  CAPABILITIES.MODERATION_CASES_READ,
  CAPABILITIES.MODERATION_CASES_MANAGE,
  CAPABILITIES.MODERATION_APPEALS_READ,
  CAPABILITIES.MODERATION_APPEALS_MANAGE,
  CAPABILITIES.ANNOUNCEMENTS_MANAGE,
  CAPABILITIES.LICENSES_MANAGE,
  CAPABILITIES.VERIFICATION_MANAGE,
  CAPABILITIES.AUDIT_READ,
  CAPABILITIES.CONFIG_READ,
  CAPABILITIES.CONFIG_WRITE,
  CAPABILITIES.CAMPAIGNS_MANAGE,
  CAPABILITIES.CODES_GENERATE,
  CAPABILITIES.SEARCH_ADMIN,
  CAPABILITIES.ANALYTICS_READ,
  CAPABILITIES.ACCOUNTS_SUSPEND,
  CAPABILITIES.ACCOUNTS_DELETE,
  CAPABILITIES.CONTENT_REVIEW,
  CAPABILITIES.CONTENT_PUBLISH,
  CAPABILITIES.SYSTEM_HEALTH,
])

/**
 * Moderator capabilities: moderation surface + read-only user/audit access.
 */
const MODERATOR_CAPABILITIES: ReadonlySet<string> = new Set([
  CAPABILITIES.MODERATION_CASES_READ,
  CAPABILITIES.MODERATION_CASES_MANAGE,
  CAPABILITIES.MODERATION_APPEALS_READ,
  CAPABILITIES.MODERATION_APPEALS_MANAGE,
  CAPABILITIES.USERS_READ,
  CAPABILITIES.AUDIT_READ,
  CAPABILITIES.CONTENT_REVIEW,
])

/**
 * User capabilities: no administrative access by default.
 */
const USER_CAPABILITIES: ReadonlySet<string> = new Set()

/**
 * Lookup table: role -> set of capabilities.
 */
export const DEFAULT_ROLE_CAPABILITIES: Record<string, ReadonlySet<string>> = {
  owner: OWNER_CAPABILITIES,
  admin: ADMIN_CAPABILITIES,
  moderator: MODERATOR_CAPABILITIES,
  user: USER_CAPABILITIES,
}

// ============================================================================
// PERMISSION RESOLVER — Phase 4A
// ============================================================================

export interface CapabilityCheck {
  capability: string
  scope?: string
}

/**
 * Checks whether an actor has a specific capability, optionally scoped.
 *
 * Resolution order:
 *   1. Scoped assignments (per-account explicit grants with scope/expiry)
 *   2. Role-based permissions (fallback to role defaults)
 *   3. Deny by default
 *
 * Scoped assignments are checked first.  If a scope is requested and a
 * scoped assignment exists for the capability but with a different scope,
 * the assignment does NOT grant access — the resolver falls through to
 * role-based checks.
 */
export async function hasCapability(
  actor: ActorContext,
  capability: string,
  scope?: string
): Promise<boolean> {
  // 1. Check scoped assignments (explicit per-account grants from DB)
  try {
    const now = new Date()
    const scoped = await db.scopedAssignment.findFirst({
      where: {
        accountId: actor.accountId,
        capability,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      select: { scope: true, id: true },
    })

    if (scoped) {
      if (!scope || scoped.scope === scope) {
        return true
      }
    }
  } catch {
    // DB table may not exist — continue to role-based checks
  }

  // 2. Check role-based DB overrides (explicit deny/grant per role)
  try {
    const rolePermission = await db.rolePermission.findUnique({
      where: {
        role_capability: {
          role: actor.role,
          capability,
        },
      },
      select: { granted: true },
    })

    if (rolePermission) {
      return rolePermission.granted
    }
  } catch {
    // DB table may not exist — continue to defaults
  }

  // 3. Fall back to hard-coded defaults
  const defaults = DEFAULT_ROLE_CAPABILITIES[actor.role]
  if (defaults) {
    return defaults.has(capability)
  }

  // 4. Unknown role — deny by default
  return false
}

/**
 * Asserts that the actor has the given capability.
 * Throws AuthorizationError("FORBIDDEN") if denied.
 */
export async function requireCapability(
  actor: ActorContext,
  capability: string,
  scope?: string
): Promise<void> {
  const allowed = await hasCapability(actor, capability, scope)
  if (!allowed) {
    throw new AuthorizationError("FORBIDDEN")
  }
}

/**
 * Returns the set of effective capabilities for an actor.
 * Merges scoped assignments and role-based permissions.
 *
 * Each entry is either a plain capability string (role-based) or a
 * "capability::scope" string (scoped assignment).
 */
export async function getEffectiveCapabilities(
  actor: ActorContext
): Promise<Set<string>> {
  const caps = new Set<string>()

  // 1. Role-based capabilities
  const rolePermissions = await db.rolePermission.findMany({
    where: { role: actor.role, granted: true },
    select: { capability: true },
  })

  if (rolePermissions.length > 0) {
    // DB has explicit records for this role — use them
    for (const rp of rolePermissions) {
      caps.add(rp.capability)
    }
  } else {
    // Fall back to hard-coded defaults
    const defaults = DEFAULT_ROLE_CAPABILITIES[actor.role]
    if (defaults) {
      for (const c of defaults) {
        caps.add(c)
      }
    }
  }

  // 2. Scoped assignments (non-expired)
  const now = new Date()
  const scoped = await db.scopedAssignment.findMany({
    where: {
      accountId: actor.accountId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    select: { capability: true, scope: true },
  })

  for (const s of scoped) {
    if (s.scope) {
      caps.add(`${s.capability}::${s.scope}`)
    } else {
      caps.add(s.capability)
    }
  }

  return caps
}

/**
 * Synchronous check against the hard-coded defaults only (no DB queries).
 * Useful for pure client-side UI gating where a round-trip is not needed.
 * Returns false for unknown roles (deny-by-default).
 */
export function hasDefaultCapability(
  role: string,
  capability: string
): boolean {
  const defaults = DEFAULT_ROLE_CAPABILITIES[role]
  if (!defaults) return false
  return defaults.has(capability)
}
