/**
 * Read-only Turso/libSQL connection smoke test.
 * Lists tables and counts rows in core tables. Never writes or drops.
 * Run: bun run scripts/db-smoke.ts
 */
import { db } from "@/lib/db"

async function main() {
  console.log("→ Connecting to Turso/libSQL…")
  const tables = (await db.$queryRaw<
    { name: string }[]
  >`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name`) as { name: string }[]
  console.log(`✓ Connected. Tables (${tables.length}):`)
  for (const t of tables) console.log(`  - ${t.name}`)

  // Safe read-only counts on core tables (skip if missing)
  const probes = ["UserProfile", "Account", "Document", "DocumentVersion", "EnglishSet"]
  for (const model of probes) {
    try {
      // @ts-expect-error dynamic model access
      const count = await db[model].count()
      console.log(`  count ${model}: ${count}`)
    } catch (e) {
      console.log(`  count ${model}: skipped (${(e as Error).message.split("\n")[0]})`)
    }
  }
  console.log("✓ Smoke test passed.")
}

main()
  .catch((e) => {
    console.error("✗ Smoke test FAILED:", e?.message || e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
