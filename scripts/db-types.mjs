// Генерирует TypeScript-типы схемы базы: node --env-file=.env.local scripts/db-types.mjs
import { writeFileSync } from "node:fs";

const res = await fetch(
  `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/types/typescript?included_schemas=public`,
  { headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` } },
);
if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
const { types } = await res.json();
writeFileSync("src/lib/supabase/database.types.ts", types);
console.log("✓ src/lib/supabase/database.types.ts");
