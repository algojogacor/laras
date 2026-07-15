import { NextResponse } from "next/server"
import { db } from "@/lib/db"

/**
 * GET /api/health
 * Health check endpoint. Returns 200 with DB status when healthy, 503 if DB is down.
 */
export async function GET() {
  try {
    // Actually check database connectivity
    await db.$queryRaw`SELECT 1`

    return NextResponse.json(
      {
        status: "healthy",
        db: "connected",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      {
        status: "unhealthy",
        db: "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
