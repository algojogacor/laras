/**
 * Laras TTS Mini-Service (Brief Section 12 — runs on Koyeb, not Vercel)
 *
 * This service handles text-to-speech generation using edge-tts (Brief Section 10.3 fallback).
 * It's a separate service because TTS is a heavy operation that would exceed
 * Vercel's serverless execution time limits.
 *
 * In production: deployed to Koyeb as a background worker.
 * In sandbox: runs on port 3002, accessed via ?XTransformPort=3002
 *
 * POST /tts
 * Body: { text: string, voice?: string }
 * Returns: { ok: true, audioUrl: string } or { ok: false, error: string }
 */

const PORT = 3002

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)

    // CORS + health check
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      })
    }

    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "laras-tts", port: PORT })
    }

    if (url.pathname === "/tts" && req.method === "POST") {
      try {
        const body = await req.json()
        const text = (body.text || "").slice(0, 1000) // edge-tts limit
        const voice = body.voice || "en-GB-SoniaNeural"

        if (!text) {
          return Response.json({ ok: false, error: "text required" }, { status: 400 })
        }

        // Generate audio via edge-tts (Python)
        const filename = `tts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`
        const filepath = `./output/${filename}`

        // Ensure output dir
        await Bun.write(filepath, "").catch(async () => {
          await Bun.write(filepath, "")
        })

        const proc = Bun.spawn(["python3", "-c", `
import asyncio, edge_tts
async def gen():
    c = edge_tts.Communicate(${JSON.stringify(text)}, ${JSON.stringify(voice)})
    await c.save(${JSON.stringify(filepath)})
asyncio.run(gen())
`], { stderr: "pipe" })

        const exitCode = await proc.exited

        if (exitCode !== 0) {
          return Response.json({ ok: false, error: "tts-failed" }, { status: 500 })
        }

        const file = Bun.file(filepath)
        const exists = await file.exists()

        if (!exists) {
          return Response.json({ ok: false, error: "audio-not-found" }, { status: 500 })
        }

        // Return audio as binary
        const buffer = await file.arrayBuffer()
        return new Response(buffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Length": buffer.byteLength.toString(),
            "Access-Control-Allow-Origin": "*",
          },
        })
      } catch (e) {
        return Response.json({ ok: false, error: (e as Error).message }, { status: 500 })
      }
    }

    return Response.json({ error: "not-found" }, { status: 404 })
  },
})

console.log(`[laras-tts] running on port ${PORT}`)
