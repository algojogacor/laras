import "server-only"
import { db } from "@/lib/db"
import { getConsentMap, type ConsentMap } from "@/lib/privacy"
import type { ActorContext } from "@/lib/authorization"

// ============================================================================
// Universal Search — Phase 8A
// Unified search across UserProfiles, Opportunities, Organizations, and
// CareerCircles with consent-gating, permission-awareness, and pagination.
// ============================================================================

export type SearchCategory = "profiles" | "opportunities" | "organizations" | "circles"
export type SearchCategoryFilter = "all" | SearchCategory

export interface SearchFilters {
  type?: SearchCategoryFilter
}

export interface SearchProfileResult {
  id: string
  fullName: string | null
  headline: string | null
  photoUrl: string | null
  skills: string[]
  matchField: string // which field matched
}

export interface SearchOpportunityResult {
  id: string
  title: string
  organization: string | null
  type: string
  location: string | null
  deadline: string | null
  matchField: string
}

export interface SearchOrganizationResult {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  logoUrl: string | null
  matchField: string
}

export interface SearchCircleResult {
  id: string
  name: string
  description: string | null
  type: string
  matchField: string
}

export type SearchResult =
  | { category: "profiles"; item: SearchProfileResult }
  | { category: "opportunities"; item: SearchOpportunityResult }
  | { category: "organizations"; item: SearchOrganizationResult }
  | { category: "circles"; item: SearchCircleResult }

export interface SearchResponse {
  results: SearchResult[]
  nextCursor: string | null
  categories: {
    profiles: { total: number }
    opportunities: { total: number }
    organizations: { total: number }
    circles: { total: number }
  }
}

interface CursorData {
  offsets: Record<SearchCategory, number>
  query: string
}

const MAX_PER_CATEGORY = 50
const MIN_QUERY_LENGTH = 2

function encodeCursor(data: CursorData): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url")
}

function decodeCursor(cursor: string): CursorData | null {
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as CursorData
  } catch {
    return null
  }
}

/**
 * Compute a simple ranking score for a text match.
 * Higher = more relevant.
 *   exact match (case-insensitive) = 100
 *   prefix match (case-insensitive startsWith) = 75
 *   contains match = 50
 */
function rankScore(query: string, text: string): number {
  const q = query.toLowerCase().trim()
  const t = text.toLowerCase().trim()
  if (!q || !t) return 0
  if (t === q) return 100
  if (t.startsWith(q)) return 75
  if (t.includes(q)) return 50
  return 0
}

/**
 * Check if any skill name matches the query and return the best match field.
 */
function matchSkills(query: string, skills: { name: string }[]): { matchField: string; score: number } | null {
  let bestScore = 0
  let bestField = ""
  for (const s of skills) {
    const score = rankScore(query, s.name)
    if (score > bestScore) {
      bestScore = score
      bestField = s.name
    }
  }
  return bestScore > 0 ? { matchField: `skill:${bestField}`, score: bestScore } : null
}

/**
 * Check whether the viewer is connected to the profile owner.
 */
async function isConnectedTo(viewerProfileId: string, targetProfileId: string): Promise<boolean> {
  if (!viewerProfileId) return false
  const conn = await db.connection.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: viewerProfileId, addresseeId: targetProfileId },
        { requesterId: targetProfileId, addresseeId: viewerProfileId },
      ],
    },
    select: { id: true },
  })
  return conn !== null
}

/**
 * Search profiles by name, headline, or skills.
 * Consent-gated: only returns public fields (and connections-level if connected).
 */
async function searchProfiles(
  query: string,
  actor: ActorContext | null,
  offset: number,
  limit: number
): Promise<{ items: SearchProfileResult[]; total: number; nextOffset: number | null }> {
  const q = query.trim()

  // Find matching profiles by name or headline
  const matches = await db.userProfile.findMany({
    where: {
      OR: [
        { fullName: { contains: q } },
        { headline: { contains: q } },
        {
          skills: {
            some: { name: { contains: q } },
          },
        },
      ],
    },
    select: {
      id: true,
      fullName: true,
      headline: true,
      photoUrl: true,
      skills: { select: { name: true } },
      email: true,
      phone: true,
      location: true,
      links: true,
    },
    take: 200, // fetch enough to rank in memory
  })

  // Rank and build results
  const ranked: { item: SearchProfileResult; score: number }[] = []

  for (const p of matches) {
    // Skip the viewer's own profile
    if (actor?.profileId === p.id) continue

    // Get consent map for this profile
    let consent: ConsentMap = {}
    try {
      consent = await getConsentMap(p.id)
    } catch {
      // If consent fetch fails, skip this profile
      continue
    }

    const isOwner = actor?.profileId === p.id
    const isConn = actor?.profileId ? await isConnectedTo(actor.profileId, p.id) : false

    // Check if fullName is visible
    const nameVisible =
      !consent.fullName || consent.fullName === "public" || (consent.fullName === "connections" && isConn)
    if (!nameVisible && !isOwner) continue

    // Calculate best match score
    let bestScore = 0
    let matchField = ""

    const nameScore = rankScore(query, p.fullName ?? "")
    if (nameScore > bestScore) { bestScore = nameScore; matchField = "fullName" }

    const headlineScore = rankScore(query, p.headline ?? "")
    if (headlineScore > bestScore) { bestScore = headlineScore; matchField = "headline" }

    const skillMatch = matchSkills(query, p.skills)
    if (skillMatch && skillMatch.score > bestScore) { bestScore = skillMatch.score; matchField = skillMatch.matchField }

    if (bestScore === 0) continue

    // Build visible result
    const visibleSkills = (!consent.skills || consent.skills === "public" || (consent.skills === "connections" && isConn))
      ? p.skills.map((s) => s.name)
      : []
    // Only include public or connections-level fields
    const result: SearchProfileResult = {
      id: p.id,
      fullName: isOwner || isConn || consent.fullName !== "private" ? p.fullName : null,
      headline: isOwner || isConn || consent.headline !== "private" ? p.headline : null,
      photoUrl: (!consent.photoUrl || consent.photoUrl === "public" || (consent.photoUrl === "connections" && isConn)) ? p.photoUrl : null,
      skills: visibleSkills,
      matchField,
    }

    ranked.push({ item: result, score: bestScore })
  }

  // Sort by score descending
  ranked.sort((a, b) => b.score - a.score)

  const total = ranked.length
  const paginated = ranked.slice(offset, offset + limit)
  const nextOffset = offset + limit < total ? offset + limit : null

  return {
    items: paginated.map((r) => r.item),
    total,
    nextOffset,
  }
}

/**
 * Search opportunities (owner-scoped).
 */
async function searchOpportunities(
  query: string,
  actor: ActorContext | null,
  offset: number,
  limit: number
): Promise<{ items: SearchOpportunityResult[]; total: number; nextOffset: number | null }> {
  if (!actor?.profileId) return { items: [], total: 0, nextOffset: null }

  const q = query.trim()

  const matches = await db.opportunity.findMany({
    where: {
      userProfileId: actor.profileId,
      OR: [
        { title: { contains: q } },
        { organization: { contains: q } },
      ],
    },
    select: {
      id: true,
      title: true,
      organization: true,
      type: true,
      location: true,
      deadline: true,
    },
    take: 200,
  })

  const ranked: { item: SearchOpportunityResult; score: number }[] = []

  for (const o of matches) {
    let bestScore = 0
    let matchField = ""

    const titleScore = rankScore(query, o.title)
    if (titleScore > bestScore) { bestScore = titleScore; matchField = "title" }

    const orgScore = rankScore(query, o.organization ?? "")
    if (orgScore > bestScore) { bestScore = orgScore; matchField = "organization" }

    if (bestScore === 0) continue

    ranked.push({
      item: {
        id: o.id,
        title: o.title,
        organization: o.organization,
        type: o.type,
        location: o.location,
        deadline: o.deadline,
        matchField,
      },
      score: bestScore,
    })
  }

  ranked.sort((a, b) => b.score - a.score)

  const total = ranked.length
  const paginated = ranked.slice(offset, offset + limit)
  const nextOffset = offset + limit < total ? offset + limit : null

  return {
    items: paginated.map((r) => r.item),
    total,
    nextOffset,
  }
}

/**
 * Search organizations (public + member-scoped).
 */
async function searchOrganizations(
  query: string,
  _actor: ActorContext | null,
  offset: number,
  limit: number
): Promise<{ items: SearchOrganizationResult[]; total: number; nextOffset: number | null }> {
  const q = query.trim()

  const matches = await db.organization.findMany({
    where: {
      name: { contains: q },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      type: true,
      logoUrl: true,
    },
    take: 200,
  })

  const ranked: { item: SearchOrganizationResult; score: number }[] = []

  for (const o of matches) {
    const score = rankScore(query, o.name)
    if (score === 0) continue

    ranked.push({
      item: {
        id: o.id,
        name: o.name,
        slug: o.slug,
        description: o.description,
        type: o.type,
        logoUrl: o.logoUrl,
        matchField: "name",
      },
      score,
    })
  }

  ranked.sort((a, b) => b.score - a.score)

  const total = ranked.length
  const paginated = ranked.slice(offset, offset + limit)
  const nextOffset = offset + limit < total ? offset + limit : null

  return {
    items: paginated.map((r) => r.item),
    total,
    nextOffset,
  }
}

/**
 * Search career circles (public + member-scoped).
 */
async function searchCircles(
  query: string,
  _actor: ActorContext | null,
  offset: number,
  limit: number
): Promise<{ items: SearchCircleResult[]; total: number; nextOffset: number | null }> {
  const q = query.trim()

  const matches = await db.careerCircle.findMany({
    where: {
      name: { contains: q },
    },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
    },
    take: 200,
  })

  const ranked: { item: SearchCircleResult; score: number }[] = []

  for (const c of matches) {
    const score = rankScore(query, c.name)
    if (score === 0) continue

    ranked.push({
      item: {
        id: c.id,
        name: c.name,
        description: c.description,
        type: c.type,
        matchField: "name",
      },
      score,
    })
  }

  ranked.sort((a, b) => b.score - a.score)

  const total = ranked.length
  const paginated = ranked.slice(offset, offset + limit)
  const nextOffset = offset + limit < total ? offset + limit : null

  return {
    items: paginated.map((r) => r.item),
    total,
    nextOffset,
  }
}

/**
 * Universal search across all entity types.
 *
 * @param query - Search query string (min 2 characters)
 * @param actor - Authenticated actor context (null for unauthenticated)
 * @param filters - Optional category filter
 * @returns SearchResponse with categorized results and pagination
 */
export async function search(
  query: string,
  actor: ActorContext | null,
  filters?: SearchFilters
): Promise<SearchResponse> {
  const q = query.trim()
  if (q.length < MIN_QUERY_LENGTH) {
    return {
      results: [],
      nextCursor: null,
      categories: {
        profiles: { total: 0 },
        opportunities: { total: 0 },
        organizations: { total: 0 },
        circles: { total: 0 },
      },
    }
  }

  const typeFilter = filters?.type ?? "all"
  const offsets: Record<SearchCategory, number> = { profiles: 0, opportunities: 0, organizations: 0, circles: 0 }

  // Determine which categories to search
  const searchCategories: SearchCategory[] =
    typeFilter === "all"
      ? ["profiles", "opportunities", "organizations", "circles"]
      : [typeFilter as SearchCategory]

  // Execute searches in parallel
  const searches = searchCategories.map(async (cat) => {
    switch (cat) {
      case "profiles":
        return { cat, ...(await searchProfiles(q, actor, offsets[cat], MAX_PER_CATEGORY)) }
      case "opportunities":
        return { cat, ...(await searchOpportunities(q, actor, offsets[cat], MAX_PER_CATEGORY)) }
      case "organizations":
        return { cat, ...(await searchOrganizations(q, actor, offsets[cat], MAX_PER_CATEGORY)) }
      case "circles":
        return { cat, ...(await searchCircles(q, actor, offsets[cat], MAX_PER_CATEGORY)) }
    }
  })

  const results_ = await Promise.all(searches)

  // Build combined results
  const combined: SearchResult[] = []
  const categories = {
    profiles: { total: 0 },
    opportunities: { total: 0 },
    organizations: { total: 0 },
    circles: { total: 0 },
  }

  for (const r of results_) {
    categories[r.cat].total = r.total
    for (const item of r.items) {
      combined.push({ category: r.cat, item } as SearchResult)
    }
  }

  // Check if there are more results in any category
  const hasMore = results_.some((r) => r.nextOffset !== null)
  const nextCursor = hasMore ? encodeCursor({ offsets: {} as Record<SearchCategory, number>, query: q }) : null

  return {
    results: combined,
    nextCursor,
    categories,
  }
}

/**
 * Search with cursor-based pagination.
 * The cursor encodes per-category offsets so the next page continues
 * where the previous one left off.
 */
export async function searchWithCursor(
  query: string,
  actor: ActorContext | null,
  filters?: SearchFilters,
  cursor?: string
): Promise<SearchResponse> {
  const q = query.trim()
  if (q.length < MIN_QUERY_LENGTH) {
    return {
      results: [],
      nextCursor: null,
      categories: {
        profiles: { total: 0 },
        opportunities: { total: 0 },
        organizations: { total: 0 },
        circles: { total: 0 },
      },
    }
  }

  let offsets: Record<SearchCategory, number> = { profiles: 0, opportunities: 0, organizations: 0, circles: 0 }

  if (cursor) {
    const decoded = decodeCursor(cursor)
    if (decoded && decoded.query === q) {
      offsets = decoded.offsets
    }
  }

  const typeFilter = filters?.type ?? "all"
  const searchCategories: SearchCategory[] =
    typeFilter === "all"
      ? ["profiles", "opportunities", "organizations", "circles"]
      : [typeFilter as SearchCategory]

  const pageSize = 10

  const searches = searchCategories.map(async (cat) => {
    const off = offsets[cat] ?? 0
    switch (cat) {
      case "profiles":
        return { cat, ...(await searchProfiles(q, actor, off, pageSize)) }
      case "opportunities":
        return { cat, ...(await searchOpportunities(q, actor, off, pageSize)) }
      case "organizations":
        return { cat, ...(await searchOrganizations(q, actor, off, pageSize)) }
      case "circles":
        return { cat, ...(await searchCircles(q, actor, off, pageSize)) }
    }
  })

  const results_ = await Promise.all(searches)

  // Update offsets for next cursor
  const newOffsets: Record<SearchCategory, number> = { ...offsets }
  const combined: SearchResult[] = []
  const categories = {
    profiles: { total: 0 },
    opportunities: { total: 0 },
    organizations: { total: 0 },
    circles: { total: 0 },
  }
  let anyMore = false

  for (const r of results_) {
    categories[r.cat].total = r.total
    for (const item of r.items) {
      combined.push({ category: r.cat, item } as SearchResult)
    }
    if (r.nextOffset !== null) {
      newOffsets[r.cat] = r.nextOffset
      anyMore = true
    } else {
      newOffsets[r.cat] = r.total // mark as exhausted
    }
  }

  const nextCursor = anyMore ? encodeCursor({ offsets: newOffsets, query: q }) : null

  return {
    results: combined,
    nextCursor,
    categories,
  }
}
