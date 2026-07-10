import { createClient } from '@libsql/client';

async function main() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!url) { console.error("✗ DATABASE_URL not set"); process.exit(1); }
  if (!authToken) { console.error("✗ TURSO_AUTH_TOKEN not set"); process.exit(1); }
  
  const hostPreview = url.replace(/libsql:\/\/([^.]+).*/, 'libsql://$1.<redacted>');
  console.log("Connecting to:", hostPreview);
  console.log("Auth token: SET (length=" + authToken.length + ")");
  
  const client = createClient({ url, authToken });
  
  // 1. Test basic connectivity
  console.log("\n=== 1. Basic connectivity test ===");
  try {
    const result = await client.execute("SELECT 1 AS ok");
    console.log("  ✓ SELECT 1 returned:", result.rows[0]);
  } catch (e: any) {
    console.error("  ✗ Basic query FAILED:", e.message);
    process.exit(1);
  }
  
  // 2. List all tables
  console.log("\n=== 2. Tables in database ===");
  let tables: string[] = [];
  try {
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY name"
    );
    tables = result.rows.map(r => String(r.name));
    console.log("  Found", tables.length, "tables:");
    for (const t of tables) console.log("    -", t);
  } catch (e: any) {
    console.error("  ✗ List tables FAILED:", e.message);
    process.exit(1);
  }
  
  // 3. Count rows in each table
  console.log("\n=== 3. Row counts (read-only, safe) ===");
  let accessible = 0;
  for (const t of tables) {
    try {
      const result = await client.execute(`SELECT COUNT(*) AS c FROM "${t}"`);
      const count = (result.rows[0] as any).c;
      console.log(`  ✓ ${t}: ${count} rows`);
      accessible++;
    } catch (e: any) {
      console.log(`  ✗ ${t}: ${e.message.slice(0, 80)}`);
    }
  }
  
  console.log(`\n=== Summary: ${accessible}/${tables.length} tables accessible ===`);
  console.log("✓ Turso connection verified successfully");
}

main().catch(e => { console.error("✗ FAILED:", e.message.slice(0, 300)); process.exit(1); });
