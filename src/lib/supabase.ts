import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Supabase clients.
 *
 * Brief Section 12.1 mandates Supabase as the database + auth + storage backbone.
 * The user provided publishable + secret keys (see .env). DDL (table creation) is
 * NOT exposed via the REST API, so the local sandbox uses Prisma+SQLite for app
 * data while Supabase is wired in here for:
 *   - Storage (listening audio in Phase 8, profile photos, exported docs)
 *   - Future Auth/DB migration once DDL access is available
 *
 * A mirror SQL migration lives at supabase/migrations/0001_init.sql.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ""
const secretKey = process.env.SUPABASE_SECRET_KEY ?? ""

/** Browser-side client (uses publishable/anon key). Safe to expose. */
export function getBrowserSupabase(): SupabaseClient {
  return createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false },
  })
}

/** Server-side client (uses secret/service-role key). Never expose to browser. */
export function getServerSupabase(): SupabaseClient {
  if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is not set")
  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false },
  })
}

export const supabaseConfigured = Boolean(supabaseUrl && publishableKey)

/** Ensure a storage bucket exists (idempotent). Used for audio/photos/docs. */
export async function ensureBucket(name: string, isPublic = false): Promise<boolean> {
  try {
    const supabase = getServerSupabase()
    const { error } = await supabase.storage.createBucket(name, {
      public: isPublic,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB
    })
    if (error && !error.message.toLowerCase().includes("already")) {
      console.warn(`[supabase] bucket "${name}" issue:`, error.message)
      return false
    }
    return true
  } catch (e) {
    console.warn(`[supabase] ensureBucket failed:`, (e as Error).message)
    return false
  }
}
