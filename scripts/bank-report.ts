/**
 * Bank report — shows statistics about the listening bank.
 * Run: bun run toefl:report
 */
import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  console.log("=== Laras English Practice Bank Report ===\n")

  const total = await db.listeningQuestion.count()
  const published = await db.listeningQuestion.count({ where: { published: true, audioUrl: { not: null } } })
  const drafts = await db.listeningQuestion.count({ where: { published: false } })

  console.log(`Listening Bank:`)
  console.log(`  Total: ${total}`)
  console.log(`  Published (with audio): ${published}`)
  console.log(`  Drafts (no audio): ${drafts}`)

  // By difficulty
  const byDiff = await db.listeningQuestion.groupBy({
    by: ["difficulty"],
    _count: true,
    where: { published: true },
  })
  console.log(`  By difficulty:`)
  byDiff.forEach((d) => console.log(`    ${d.difficulty}: ${d._count}`))

  // Audio source
  const supabaseCount = await db.listeningQuestion.count({
    where: { audioUrl: { contains: "supabase.co" } },
  })
  const localCount = await db.listeningQuestion.count({
    where: { audioUrl: { contains: "/audio/listening/" } },
  })
  console.log(`  Audio source:`)
  console.log(`    Supabase Storage: ${supabaseCount}`)
  console.log(`    Local filesystem: ${localCount}`)

  // English sessions (user attempts)
  const sessions = await db.englishSession.count()
  const scored = await db.englishSession.count({ where: { score: { not: null } } })
  console.log(`\nEnglish Sessions (user attempts):`)
  console.log(`  Total: ${sessions}`)
  console.log(`  Scored: ${scored}`)

  // By module
  const byModule = await db.englishSession.groupBy({
    by: ["module"],
    _count: true,
  })
  console.log(`  By module:`)
  byModule.forEach((m) => console.log(`    ${m.module}: ${m._count}`))

  // Target progress
  console.log(`\nTarget Progress:`)
  console.log(`  Listening: ${published} / 600 (${Math.round((published / 600) * 100)}%)`)
  console.log(`  Reading: on-the-go (not banked)`)
  console.log(`  Structure: on-the-go (not banked)`)

  console.log(`\n=== End Report ===`)

  await db.$disconnect()
}

main().catch(console.error)
