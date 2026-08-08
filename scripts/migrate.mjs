#!/usr/bin/env node
/**
 * Forward-only SQL migration runner (no ORM).
 * Usage: DATABASE_URL=postgres://... node scripts/migrate.mjs
 * Applied files are tracked in the schema_migrations table.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ...(process.env.DATABASE_SSL === "true" ? { ssl: { rejectUnauthorized: false } } : {}),
});
await client.connect();

await client.query(
  `CREATE TABLE IF NOT EXISTS schema_migrations (
     name text PRIMARY KEY,
     applied_at timestamptz NOT NULL DEFAULT now()
   )`,
);

const { rows } = await client.query("SELECT name FROM schema_migrations");
const applied = new Set(rows.map((r) => r.name));

const files = (await readdir(dir))
  .filter((f) => f.endsWith(".sql") && !f.endsWith(".down.sql"))
  .sort();

for (const file of files) {
  if (applied.has(file)) {
    console.log(`skip   ${file}`);
    continue;
  }
  const sql = await readFile(join(dir, file), "utf8");
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    await client.query("COMMIT");
    console.log(`apply  ${file}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`failed ${file}: ${error.message}`);
    process.exit(1);
  }
}

await client.end();
console.log("migrations ok");
