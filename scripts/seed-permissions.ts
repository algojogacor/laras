/**
 * Seed default permissions — Phase 4A.
 *
 * Creates every Permission row and the default RolePermission grants for
 * owner, admin, moderator, and user roles.  Idempotent: safe to run
 * multiple times (uses upsert).
 *
 * Usage:
 *   bun run scripts/seed-permissions.ts
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

// ============================================================================
// CAPABILITY DEFINITIONS
// ============================================================================

interface CapabilityDef {
  capability: string
  description: string
  owner: boolean
  admin: boolean
  moderator: boolean
  user: boolean
}

const CAPABILITY_DEFS: CapabilityDef[] = [
  { capability: "users.read", description: "View user accounts and profiles", owner: true, admin: true, moderator: true, user: false },
  { capability: "users.write", description: "Create or update user accounts", owner: true, admin: true, moderator: false, user: false },
  { capability: "roles.manage", description: "Assign and revoke roles (owner-only)", owner: true, admin: false, moderator: false, user: false },
  { capability: "moderation.cases.read", description: "View moderation cases", owner: true, admin: true, moderator: true, user: false },
  { capability: "moderation.cases.manage", description: "Create, update, and resolve moderation cases", owner: true, admin: true, moderator: true, user: false },
  { capability: "moderation.appeals.read", description: "View moderation appeals", owner: true, admin: true, moderator: true, user: false },
  { capability: "moderation.appeals.manage", description: "Process moderation appeals", owner: true, admin: true, moderator: true, user: false },
  { capability: "announcements.manage", description: "Create, publish, and archive announcements", owner: true, admin: true, moderator: false, user: false },
  { capability: "licenses.manage", description: "Grant, suspend, and revoke licenses", owner: true, admin: true, moderator: false, user: false },
  { capability: "verification.manage", description: "Issue and revoke verification badges", owner: true, admin: true, moderator: false, user: false },
  { capability: "audit.read", description: "View audit logs", owner: true, admin: true, moderator: true, user: false },
  { capability: "config.read", description: "Read system configuration", owner: true, admin: true, moderator: false, user: false },
  { capability: "config.write", description: "Write system configuration", owner: true, admin: true, moderator: false, user: false },
  { capability: "campaigns.manage", description: "Create and manage license campaigns", owner: true, admin: true, moderator: false, user: false },
  { capability: "codes.generate", description: "Generate license redemption codes", owner: true, admin: true, moderator: false, user: false },
  { capability: "search.admin", description: "Perform admin-scoped searches", owner: true, admin: true, moderator: false, user: false },
  { capability: "analytics.read", description: "View platform analytics", owner: true, admin: true, moderator: false, user: false },
  { capability: "accounts.suspend", description: "Suspend and unsuspend accounts", owner: true, admin: true, moderator: false, user: false },
  { capability: "accounts.delete", description: "Permanently delete accounts", owner: true, admin: true, moderator: false, user: false },
  { capability: "content.review", description: "Review user-generated content", owner: true, admin: true, moderator: true, user: false },
  { capability: "content.publish", description: "Publish reviewed content", owner: true, admin: true, moderator: false, user: false },
  { capability: "system.health", description: "View system health status", owner: true, admin: true, moderator: false, user: false },
  { capability: "system.maintenance", description: "Toggle maintenance mode", owner: true, admin: false, moderator: false, user: false },
]

// ============================================================================
// SEED
// ============================================================================

async function main() {
  console.log("[seed-permissions] Starting...")

  let createdPermissions = 0
  let skippedPermissions = 0

  for (const def of CAPABILITY_DEFS) {
    const existing = await db.permission.findUnique({
      where: { capability: def.capability },
    })

    if (existing) {
      // Update description if changed (idempotent)
      if (existing.description !== def.description) {
        await db.permission.update({
          where: { capability: def.capability },
          data: { description: def.description },
        })
      }
      skippedPermissions++
    } else {
      await db.permission.create({
        data: {
          capability: def.capability,
          description: def.description,
        },
      })
      createdPermissions++
    }
  }

  console.log(`[seed-permissions] Permissions: ${createdPermissions} created, ${skippedPermissions} already existed`)

  // RolePermission defaults
  const roles = ["owner", "admin", "moderator", "user"] as const
  let upsertedRolePermissions = 0

  for (const def of CAPABILITY_DEFS) {
    for (const role of roles) {
      const granted = def[role]

      await db.rolePermission.upsert({
        where: {
          role_capability: {
            role,
            capability: def.capability,
          },
        },
        update: { granted },
        create: {
          role,
          capability: def.capability,
          granted,
        },
      })
      upsertedRolePermissions++
    }
  }

  console.log(`[seed-permissions] RolePermissions: ${upsertedRolePermissions} upserted`)
  console.log(`[seed-permissions] Done.`)
}

main()
  .catch((e) => {
    console.error("[seed-permissions] Fatal error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
