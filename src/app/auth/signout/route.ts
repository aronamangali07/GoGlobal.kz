import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/** Выход и очистка кук сессии (в т.ч. битой) — затем на страницу входа. */
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  }
  // На случай, если signOut не смог (сессия уже отозвана) — удаляем куки Supabase вручную
  for (const c of request.cookies.getAll()) {
    if (c.name.startsWith("sb-")) response.cookies.delete(c.name);
  }
  return response;
}
