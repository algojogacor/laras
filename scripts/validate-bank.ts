/**
 * Validate the listening bank — checks all published questions have valid audio,
 * correct schema, valid answer keys, no empty fields.
 * Run: bun run toefl:validate
 */
import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  console.log("[validate] Checking listening bank...")
  const questions = await db.listeningQuestion.findMany()
  
  let valid = 0
  let invalid = 0
  const issues: string[] = []

  for (const q of questions) {
    const problems: string[] = []
    
    if (!q.title) problems.push("empty title")
    if (!q.script) problems.push("empty script")
    if (!q.speaker) problems.push("empty speaker")
    if (!q.questions) problems.push("empty questions")
    else {
      try {
        const parsed = JSON.parse(q.questions)
        if (!Array.isArray(parsed) || parsed.length === 0) problems.push("questions not array or empty")
        else {
          parsed.forEach((item: any, i: number) => {
            if (!item.question) problems.push(`q${i}: empty question`)
            if (!Array.isArray(item.options) || item.options.length !== 4) problems.push(`q${i}: need 4 options`)
            if (typeof item.answer !== "number" || item.answer < 0 || item.answer > 3) problems.push(`q${i}: invalid answer`)
            if (!item.explanation) problems.push(`q${i}: empty explanation`)
          })
        }
      } catch { problems.push("questions JSON parse error") }
    }
    if (!q.audioUrl) problems.push("missing audioUrl")
    if (q.published && !q.audioUrl) problems.push("published but no audioUrl")

    if (problems.length > 0) {
      invalid++
      issues.push(`  [${q.id}] "${q.title}": ${problems.join(", ")}`)
    } else {
      valid++
    }
  }

  console.log(`\n[validate] Results: ${valid} valid, ${invalid} invalid out of ${questions.length} total`)
  if (issues.length > 0) {
    console.log("\nIssues:")
    issues.forEach((i) => console.log(i))
  } else {
    console.log("[validate] All questions are valid! ✅")
  }

  await db.$disconnect()
}

main().catch(console.error)
