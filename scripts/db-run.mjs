// Выполняет SQL-файл(ы) в проекте Supabase через Management API.
// Использование: node --env-file=.env.local scripts/db-run.mjs supabase/migrations/0002_x.sql
import { readFileSync } from "node:fs";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
if (!token || !ref) {
  console.error("Задайте SUPABASE_ACCESS_TOKEN и SUPABASE_PROJECT_REF в .env.local");
  process.exit(1);
}
for (const file of process.argv.slice(2)) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: readFileSync(file, "utf8") }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`✗ ${file}: ${res.status} ${body}`);
    process.exit(1);
  }
  console.log(`✓ ${file}`, body.length > 2 ? body.slice(0, 500) : "");
}
