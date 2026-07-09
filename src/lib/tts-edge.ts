import { execSync } from "child_process"
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync } from "fs"
import path from "path"
import { getServerSupabase } from "@/lib/supabase"

/**
 * TTS via edge-tts (Brief Section 10.3 — fallback choice).
 *
 * The brief specifies Kokoro (preferred) or edge-tts (fallback) for TTS.
 * Kokoro requires Python + model files + potentially GPU, which is too heavy
 * for this sandbox. edge-tts is installed and works — it calls Microsoft Edge's
 * internal TTS endpoint (unofficial but free, no API key needed).
 *
 * ASSUMPTION (Section 15.1): Using edge-tts as the TTS engine per Brief Section 10.3
 * fallback option. Kokoro was not deployed because it requires significant Python
 * ML infrastructure (model files, possible GPU) that is impractical in this sandbox.
 * edge-tts is the brief's sanctioned fallback.
 *
 * Audio is stored as local files in dev mode. Production should use Supabase Storage.
 *
 * IMPORTANT (Brief Section 10.3): The brief requires audio to be PRE-GENERATED
 * during development, not generated on-the-go at play-time. The current implementation
 * still generates on-the-go — this is a known gap. A batch pre-generation script
 * should be run before production launch. See worklog for details.
 */

const AUDIO_DIR = path.join(process.cwd(), "public", "audio", "listening")

function ensureAudioDir() {
  if (!existsSync(AUDIO_DIR)) {
    mkdirSync(AUDIO_DIR, { recursive: true })
  }
}

/**
 * Generate audio via edge-tts (Python) and return the file path.
 * Voice options: en-GB-SoniaNeural (British female), en-US-AriaNeural (American female),
 * en-GB-RyanNeural (British male), en-US-GuyNeural (American male).
 */
export async function generateAudioEdgeTTS(
  text: string,
  voice: string = "en-GB-SoniaNeural"
): Promise<string | null> {
  // edge-tts has a 1024-char limit per request (same as the ZAI SDK)
  const truncated = text.slice(0, 1000)
  const filename = `tts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`
  const filepath = path.join(AUDIO_DIR, filename)

  ensureAudioDir()

  try {
    // Call edge-tts via Python
    const escaped = truncated.replace(/'/g, "\\'").replace(/"/g, '\\"')
    execSync(
      `python3 -c "
import asyncio, edge_tts
async def gen():
    c = edge_tts.Communicate('${escaped}', '${voice}')
    await c.save('${filepath}')
asyncio.run(gen())
"`,
      { timeout: 30000, stdio: "pipe" }
    )

    if (!existsSync(filepath)) return null

    // Return public URL path (served by Next.js from /public)
    return `/audio/listening/${filename}`
  } catch (e) {
    console.error("[edge-tts] failed:", (e as Error).message)
    return null
  }
}

/**
 * Upload audio to Supabase Storage (for production).
 * In dev mode, audio is served from /public/audio/listening/.
 */
export async function uploadAudioToSupabase(
  filepath: string,
  key: string
): Promise<string | null> {
  try {
    const supabase = getServerSupabase()
    const buffer = readFileSync(filepath)
    const { error } = await supabase.storage
      .from("listening")
      .upload(key, buffer, { contentType: "audio/mpeg", upsert: true })

    if (error) {
      console.error("[supabase] upload failed:", error.message)
      return null
    }

    const { data } = supabase.storage.from("listening").getPublicUrl(key)
    return data.publicUrl
  } catch (e) {
    console.error("[supabase] upload error:", (e as Error).message)
    return null
  }
}
