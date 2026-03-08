import { createBrowserClient } from "@supabase/ssr";

const PERSISTENT_COOKIE_MAX_AGE = 400 * 24 * 60 * 60; // 400 days for PWA persistence

const COOKIE_BACKUP_KEY = "oasis-auth-cookies";

function isAuthCookie(name: string): boolean {
  return name.includes("auth-token") || name.includes("code-verifier");
}

function getAll(): { name: string; value: string }[] {
  if (typeof document === "undefined") return [];
  return document.cookie.split(";").map((s) => {
    const eq = s.indexOf("=");
    const name = eq < 0 ? s.trim() : s.slice(0, eq).trim();
    const value = eq < 0 ? "" : s.slice(eq + 1).trim();
    return { name, value: value || "" };
  }).filter((c) => c.name);
}

function setAll(
  cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[],
): void {
  const opts = {
    path: "/",
    sameSite: "lax" as const,
    maxAge: PERSISTENT_COOKIE_MAX_AGE,
  };
  cookiesToSet.forEach(({ name, value, options }) => {
    const o = { ...opts, ...options } as { path?: string; sameSite?: string; maxAge?: number };
    let s = `${name}=${encodeURIComponent(value)}; path=${o.path ?? "/"}; SameSite=${o.sameSite ?? "lax"}`;
    if (o.maxAge !== undefined && o.maxAge > 0) s += `; max-age=${o.maxAge}`;
    else if (o.maxAge === 0) s += "; max-age=0";
    document.cookie = s;
  });
  const authRelated = cookiesToSet.filter((c) => isAuthCookie(c.name));
  if (authRelated.length > 0 && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(
        COOKIE_BACKUP_KEY,
        JSON.stringify(authRelated.map(({ name, value, options }) => ({ name, value, options: { ...opts, ...options } }))),
      );
    } catch {
      // ignore quota or private mode
    }
  }
}

export function createClient() {
  if (typeof document !== "undefined") {
    const backup = localStorage.getItem(COOKIE_BACKUP_KEY);
    const fromCookie = getAll();
    const hasAuthCookie = fromCookie.some((c) => isAuthCookie(c.name));
    if (!hasAuthCookie && backup) {
      try {
        const arr = JSON.parse(backup) as { name: string; value: string; options?: Record<string, unknown> }[];
        if (Array.isArray(arr)) setAll(arr);
      } catch {
        localStorage.removeItem(COOKIE_BACKUP_KEY);
      }
    }
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        maxAge: PERSISTENT_COOKIE_MAX_AGE,
      },
      cookies: { getAll, setAll },
    },
  );
}
