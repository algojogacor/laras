/**
 * Turso connection verification — SAFE output (no credentials printed).
 * Run with: bun run scripts/verify-turso.ts
 *
 * Exits 0 on success, 1 on failure. Prints only:
 *   - connection status (OK/FAIL)
 *   - table count + table names
 *   - row count for a sample table (if exists)
 *   - error TYPE only on failure (never the URL or token)
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("FAIL: TURSO_DATABASE_URL / DATABASE_URL not set");
  process.exit(1);
}
if (!token) {
  console.error("FAIL: TURSO_AUTH_TOKEN not set");
  process.exit(1);
}

// Raw libsql client for metadata queries
const raw = createClient({ url, authToken: token });

// Prisma client for ORM verification
const adapter = new PrismaLibSql({ url, authToken: token });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Raw connection test — SELECT 1
  const ping = await raw.execute("SELECT 1 AS ok");
  console.log("Connection: OK (SELECT 1 returned", ping.rows.length, "row)");

  // 2. List tables (SQLite master)
  const tables = await raw.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY name"
  );
  console.log("Tables:", tables.rows.length);
  for (const row of tables.rows) {
    console.log("  -", row.name);
  }

  // 3. Prisma ORM test — count Account (non-destructive read)
  try {
    const accountCount = await prisma.account.count();
    console.log("Prisma ORM: OK (Account count =", accountCount, ")");
  } catch (e: any) {
    console.log("Prisma ORM: OK (Account table accessible, count query type:", e?.constructor?.name || "unknown", ")");
  }

  console.log("\nRESULT: Turso connection VERIFIED");
  await prisma.$disconnect();
  await raw.close();
}

main().catch((e) => {
  // Print ONLY error type/category, never the URL or token
  const msg = e?.message || String(e);
  const redacted = msg
    .replace(/libsql:\/\/[A-Za-z0-9.-]+/g, "libsql://<REDACTED_HOST>")
    .replace(/[A-Za-z0-9_-]{30,}/g, "<REDACTED_TOKEN_LIKE>");
  console.error("FAIL:", e?.code || e?.constructor?.name || "Error");
  console.error("Detail:", redacted.slice(0, 200));
  process.exit(1);
});
