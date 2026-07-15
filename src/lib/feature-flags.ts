import "server-only"
import { db } from "@/lib/db"

// ============================================================================
// Feature Flags & Dynamic Config — Phase 5B
// ============================================================================

// ---------------------------------------------------------------------------
// Feature Flag Evaluation
// ---------------------------------------------------------------------------

export interface FeatureFlagRules {
  plans?: string[] // Plan names that get this feature
  roles?: string[] // Roles that get this feature
  percentage?: number // 0-100, percentage of random users who get it
}

/**
 * Check if a feature flag is enabled for the given context.
 *
 * Resolution order:
 * 1. FeatureFlag.enabled = false → return false immediately
 * 2. Evaluate rules (plan, role, percentage) if present
 * 3. If no rules, enabled flag alone determines the result
 *
 * @param key - The FeatureFlag.key to check
 * @param context - Optional: { plan, role, seed } for rule evaluation
 */
export async function isFeatureEnabled(
  key: string,
  context?: { plan?: string; role?: string; seed?: string }
): Promise<boolean> {
  const flag = await db.featureFlag.findUnique({
    where: { key },
    select: { enabled: true, rules: true },
  })

  if (!flag || !flag.enabled) return false

  // If no rules, the enabled flag alone controls it
  if (!flag.rules) return true

  let rules: FeatureFlagRules
  try {
    rules = JSON.parse(flag.rules) as FeatureFlagRules
  } catch {
    return flag.enabled
  }

  // Evaluate plan rule
  if (rules.plans && rules.plans.length > 0) {
    if (!context?.plan || !rules.plans.includes(context.plan)) {
      return false
    }
  }

  // Evaluate role rule
  if (rules.roles && rules.roles.length > 0) {
    if (!context?.role || !rules.roles.includes(context.role)) {
      return false
    }
  }

  // Evaluate percentage roll-out
  if (rules.percentage !== undefined && rules.percentage < 100) {
    if (rules.percentage <= 0) return false
    const effectiveSeed = context?.seed ?? key
    const hash = hashString(effectiveSeed + ":" + key)
    if (hash % 100 >= rules.percentage) {
      return false
    }
  }

  return true
}

/**
 * Simple deterministic hash for percentage-based rollouts.
 * Returns a number 0-99.
 */
function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff
  }
  return Math.abs(hash) % 100
}

/**
 * Check multiple feature flags at once.
 * Returns a map of key → enabled status.
 */
export async function checkFeatureFlags(
  keys: string[],
  context?: { plan?: string; role?: string; seed?: string }
): Promise<Map<string, boolean>> {
  const flags = await db.featureFlag.findMany({
    where: { key: { in: keys } },
    select: { key: true, enabled: true, rules: true },
  })

  const result = new Map<string, boolean>()
  for (const key of keys) {
    const flag = flags.find((f) => f.key === key)
    if (!flag || !flag.enabled) {
      result.set(key, false)
      continue
    }

    if (!flag.rules) {
      result.set(key, true)
      continue
    }

    let rules: FeatureFlagRules
    try {
      rules = JSON.parse(flag.rules) as FeatureFlagRules
    } catch {
      result.set(key, flag.enabled)
      continue
    }

    let passes = true

    if (rules.plans && rules.plans.length > 0) {
      if (!context?.plan || !rules.plans.includes(context.plan)) {
        passes = false
      }
    }

    if (passes && rules.roles && rules.roles.length > 0) {
      if (!context?.role || !rules.roles.includes(context.role)) {
        passes = false
      }
    }

    if (passes && rules.percentage !== undefined && rules.percentage < 100) {
      if (rules.percentage <= 0) {
        passes = false
      } else {
        const effectiveSeed = context?.seed ?? key
        const hash = hashString(effectiveSeed + ":" + key)
        if (hash % 100 >= rules.percentage) {
          passes = false
        }
      }
    }

    result.set(key, passes)
  }

  return result
}

// ---------------------------------------------------------------------------
// Dynamic Config — cached with 60s TTL
// ---------------------------------------------------------------------------

interface CacheEntry<T = unknown> {
  value: T
  fetchedAt: number
}

const configCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60_000 // 60 seconds

function getCached<T>(key: string): T | undefined {
  const entry = configCache.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    configCache.delete(key)
    return undefined
  }
  return entry.value as T
}

function setCache<T>(key: string, value: T): void {
  configCache.set(key, { value, fetchedAt: Date.now() })
}

/**
 * Invalidate a single key or all config cache entries.
 */
export function invalidateConfigCache(key?: string): void {
  if (key) {
    configCache.delete(key)
  } else {
    configCache.clear()
  }
}

/**
 * Read a DynamicConfig value by key.
 * Returns the parsed JSON value, or null if not found.
 * Results are cached in memory for 60 seconds.
 */
export async function getConfig<T = unknown>(key: string): Promise<T | null> {
  const cached = getCached<T>(key)
  if (cached !== undefined) return cached

  const config = await db.dynamicConfig.findUnique({
    where: { key },
    select: { value: true },
  })

  if (!config) {
    setCache(key, null)
    return null
  }

  try {
    const parsed = JSON.parse(config.value) as T
    setCache(key, parsed)
    return parsed
  } catch {
    // Return raw string if not valid JSON
    setCache(key, config.value as unknown as T)
    return config.value as unknown as T
  }
}

/**
 * Set (create or update) a DynamicConfig value.
 * Automatically invalidates the cache for this key.
 */
export async function setConfig(
  key: string,
  value: unknown,
  updatedById: string
): Promise<void> {
  const valueStr = typeof value === "string" ? value : JSON.stringify(value)

  await db.dynamicConfig.upsert({
    where: { key },
    create: {
      key,
      value: valueStr,
      updatedById,
    },
    update: {
      value: valueStr,
      updatedById,
    },
  })

  // Invalidate cache for this key
  invalidateConfigCache(key)
}

/**
 * Delete a DynamicConfig entry.
 */
export async function deleteConfig(key: string): Promise<boolean> {
  try {
    await db.dynamicConfig.delete({ where: { key } })
    invalidateConfigCache(key)
    return true
  } catch {
    return false
  }
}

/**
 * List all DynamicConfig entries (for admin UI).
 */
export async function listConfigs(): Promise<
  Array<{ key: string; value: string; description: string | null; updatedAt: Date }>
> {
  const configs = await db.dynamicConfig.findMany({
    orderBy: { key: "asc" },
    select: { key: true, value: true, description: true, updatedAt: true },
  })

  return configs
}

/**
 * List all FeatureFlags with their current state.
 */
export async function listFeatureFlags(): Promise<
  Array<{
    id: string
    key: string
    enabled: boolean
    description: string | null
    rules: string | null
    updatedAt: Date
  }>
> {
  const flags = await db.featureFlag.findMany({
    orderBy: { key: "asc" },
    select: { id: true, key: true, enabled: true, description: true, rules: true, updatedAt: true },
  })

  return flags
}

/**
 * Upsert a FeatureFlag entry.
 */
export async function upsertFeatureFlag(
  key: string,
  data: {
    enabled: boolean
    description?: string
    rules?: FeatureFlagRules
  }
): Promise<void> {
  await db.featureFlag.upsert({
    where: { key },
    create: {
      key,
      enabled: data.enabled,
      description: data.description ?? null,
      rules: data.rules ? JSON.stringify(data.rules) : null,
    },
    update: {
      enabled: data.enabled,
      description: data.description ?? undefined,
      rules: data.rules ? JSON.stringify(data.rules) : null,
    },
  })
}

/**
 * Delete a FeatureFlag entry.
 */
export async function deleteFeatureFlag(key: string): Promise<boolean> {
  try {
    await db.featureFlag.delete({ where: { key } })
    return true
  } catch {
    return false
  }
}
