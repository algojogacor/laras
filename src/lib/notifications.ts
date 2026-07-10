import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"

/**
 * Returns the count of pending incoming connection requests for the current
 * user, or 0 if not authenticated.
 */
export async function getPendingConnectionCount(): Promise<number> {
  const session = await getSession()
  if (!session) return 0

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) return 0

  return db.connection.count({
    where: { addresseeId: profile.id, status: "pending" },
  })
}
