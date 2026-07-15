import { NextRequest } from "next/server"
import { getSession } from "@/lib/auth"
import { searchWithCursor, type SearchCategoryFilter } from "@/lib/search"
import { handleAuthorizationError, safeNextResponse, AuthorizationError } from "@/lib/authorization"
import type { ActorContext } from "@/lib/authorization"

const VALID_TYPES: SearchCategoryFilter[] = ["all", "profiles", "opportunities", "organizations", "circles"]

/**
 * GET /api/search?q=...&type=...&cursor=...
 *
 * Universal search across profiles, opportunities, organizations, and circles.
 * - Authenticated users get full search including their own opportunities.
 * - Unauthenticated users can only search public profiles, organizations, and circles.
 * - Minimum query length: 2 characters.
 * - Results are consent-gated and permission-aware.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim() ?? ""
    const typeParam = searchParams.get("type") ?? "all"
    const cursor = searchParams.get("cursor") ?? undefined

    // Validate query length
    if (q.length > 0 && q.length < 2) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    // Validate type filter
    let type: SearchCategoryFilter = "all"
    if (typeParam && typeParam !== "all") {
      if ((VALID_TYPES as string[]).includes(typeParam)) {
        type = typeParam as SearchCategoryFilter
      } else {
        type = "all"
      }
    }

    // Resolve actor (optional — unauthenticated users can search public content)
    let actor: ActorContext | null = null
    try {
      const session = await getSession()
      if (session) {
        const { db } = await import("@/lib/db")
        const account = await db.account.findUnique({
          where: { id: session.userId },
          select: { id: true, email: true, role: true },
        })
        if (account) {
          const profile = await db.userProfile.findUnique({
            where: { accountId: account.id },
            select: { id: true },
          })
          actor = {
            accountId: account.id,
            profileId: profile?.id ?? null,
            email: account.email,
            role: account.role as ActorContext["role"],
          }
        }
      }
    } catch {
      // Proceed as unauthenticated
    }

    // Empty query = return empty result (valid state)
    if (q.length === 0) {
      return safeNextResponse({
        results: [],
        nextCursor: null,
        categories: {
          profiles: { total: 0 },
          opportunities: { total: 0 },
          organizations: { total: 0 },
          circles: { total: 0 },
        },
      })
    }

    const result = await searchWithCursor(q, actor, { type }, cursor)

    return safeNextResponse(result)
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
