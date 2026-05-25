#!/usr/bin/env node
// Run pending migrations against the Supabase Postgres database.
// Usage: DATABASE_URL=<connection-string> node scripts/migrate.js
//
// Find your connection string in Supabase dashboard:
//   Settings → Database → Connection string → URI (use the "direct" one)

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const migrations = [
  {
    name: "002_add_place_id",
    sql: "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS place_id TEXT UNIQUE;",
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: DATABASE_URL env var is required");
    console.error(
      "  Find it in Supabase dashboard → Settings → Database → Connection string (URI)"
    );
    process.exit(1);
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  for (const migration of migrations) {
    console.log(`Running ${migration.name}...`);
    try {
      await client.query(migration.sql);
      console.log(`  ✓ Done`);
    } catch (e) {
      console.error(`  ✗ Failed: ${e.message}`);
    }
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
