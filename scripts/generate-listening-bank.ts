/**
 * Batch pre-generation script for Listening audio bank (Brief Section 10.3).
 *
 * GENERATION-TIME pipeline (runs during development, NOT at play-time):
 *   1. Generate listening script + questions via LLM (Content Engine)
 *   2. Generate audio via edge-tts
 *   3. Save audio file to /public/audio/listening/
 *   4. Insert ListeningQuestion row with audioUrl filled + published=true
 *
 * Run: bun run scripts/generate-listening-bank.ts [count] [difficulty]
 * Example: bun run scripts/generate-listening-bank.ts 5 medium
 *
 * After running, the /api/english/generate?module=listening endpoint will
 * serve from this pre-generated bank instead of generating on-the-go.
 */

import { generateListening } from "../src/lib/content-engine"
import { generateAudioEdgeTTS } from "../src/lib/tts-edge"
import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  const count = parseInt(process.argv[2] || "3")
  const difficulty = (process.argv[3] || "medium") as "easy" | "medium" | "hard"

  console.log(`[listening-bank] Generating ${count} ${difficulty} listening questions with audio...`)

  let success = 0
  let failed = 0

  for (let i = 0; i < count; i++) {
    console.log(`\n[${i + 1}/${count}] Generating listening script...`)
    try {
      // 1. Generate script + questions via LLM
      const listening = await generateListening({ difficulty })
      if (!listening.script || listening.questions.length === 0) {
        console.log(`  ✗ LLM generation failed (empty script/questions)`)
        failed++
        continue
      }
      console.log(`  ✓ Script: "${listening.title}" (${listening.script.length} chars, ${listening.questions.length} questions)`)

      // 2. Generate audio via edge-tts
      const ttsText = listening.script
        .replace(/Speaker \d+:\s*/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1020)

      console.log(`  Generating audio via edge-tts...`)
      const audioUrl = await generateAudioEdgeTTS(ttsText, "en-GB-SoniaNeural")
      if (!audioUrl) {
        console.log(`  ✗ TTS failed — saving as draft (published=false)`)
        await db.listeningQuestion.create({
          data: {
            title: listening.title,
            script: listening.script,
            speaker: listening.speaker,
            questions: JSON.stringify(listening.questions),
            difficulty: listening.difficulty,
            topic: listening.topic,
            audioUrl: null,
            published: false, // draft — not shown to users until audio is generated
          },
        })
        failed++
        continue
      }
      console.log(`  ✓ Audio: ${audioUrl}`)

      // 3. Save to database with audioUrl + published=true
      await db.listeningQuestion.create({
        data: {
          title: listening.title,
          script: listening.script,
          speaker: listening.speaker,
          questions: JSON.stringify(listening.questions),
          difficulty: listening.difficulty,
          topic: listening.topic,
          audioUrl: audioUrl,
          published: true, // ready for users — audio is pre-generated
        },
      })
      console.log(`  ✓ Saved to bank (published=true)`)
      success++
    } catch (e) {
      console.log(`  ✗ Error: ${(e as Error).message}`)
      failed++
    }

    // Small delay between generations to avoid rate limits
    if (i < count - 1) await new Promise((r) => setTimeout(r, 2000))
  }

  console.log(`\n[listening-bank] Done: ${success} success, ${failed} failed`)

  // Report bank status
  const total = await db.listeningQuestion.count()
  const published = await db.listeningQuestion.count({ where: { published: true, audioUrl: { not: null } } })
  const drafts = await db.listeningQuestion.count({ where: { published: false } })
  console.log(`[listening-bank] Bank status: ${total} total, ${published} published (with audio), ${drafts} drafts (no audio)`)

  await db.$disconnect()
}

main().catch(console.error)
