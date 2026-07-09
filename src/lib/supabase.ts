import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Supabase clients (Brief Section 12.1).
 *
 * DB migration BLOCKED: direct Postgres connection (port 5432) resolves to IPv6 only
 * (sandbox has no IPv6). Pooler (port 6543) returns "tenant/user not found" across all
 * regions. REST API (port 443) works — Supabase Storage is fully functional.
 *
 * Storage buckets created: listening-audio (public), generated-documents (private),
 * user-exports (private), deck-exports (private), pdf-exports (private), profile-photos (private).
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

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
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export const supabaseConfigured = Boolean(supabaseUrl && publishableKey)

/**
 * Upload a file to Supabase Storage and return the public URL (for public buckets)
 * or signed URL (for private buckets).
 */
export async function uploadToSupabase(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string,
  isPublic = false
): Promise<string | null> {
  try {
    const supabase = getServerSupabase()
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType, upsert: true })

    if (error) {
      console.warn(`[supabase] upload to "${bucket}/${path}" failed:`, error.message)
      return null
    }

    if (isPublic) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      return data.publicUrl
    } else {
      const { data, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600) // 1 hour signed URL
      if (signError || !data?.signedUrl) {
        console.warn(`[supabase] signed URL failed:`, signError?.message)
        return null
      }
      return data.signedUrl
    }
  } catch (e) {
    console.warn(`[supabase] upload error:`, (e as Error).message)
    return null
  }
}

/**
 * Upload a local file to Supabase Storage. Used by batch scripts.
 * Returns the public URL or null on failure.
 */
export async function uploadLocalFileToSupabase(
  bucket: string,
  localPath: string,
  storagePath: string,
  contentType: string,
  isPublic = false
): Promise<string | null> {
  try {
    const { readFileSync } = await import("fs")
    const buffer = readFileSync(localPath) as Buffer
    return uploadToSupabase(bucket, storagePath, buffer, contentType, isPublic)
  } catch (e) {
    console.warn(`[supabase] uploadLocalFile failed:`, (e as Error).message)
    return null
  }
}

/** Ensure a storage bucket exists (idempotent). */
export async function ensureBucket(name: string, isPublic = false): Promise<boolean> {
  try {
    const supabase = getServerSupabase()
    const { error } = await supabase.storage.createBucket(name, {
      public: isPublic,
      fileSizeLimit: 50 * 1024 * 1024,
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
