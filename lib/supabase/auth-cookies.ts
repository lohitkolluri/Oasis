type CookieLike = { name: string; value?: string };
type CookieReader = { getAll(): CookieLike[] };

/**
 * Supabase SSR stores session state in project-scoped cookies named like
 * `sb-<project-ref>-auth-token`. Use this only as a cheap presence check before
 * making a real Auth call; never treat it as proof that a user is authenticated.
 */
export function hasSupabaseAuthCookie(cookies: CookieReader): boolean {
  return cookies.getAll().some((cookie) => {
    if (!cookie.value) return false;
    return (
      (cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')) ||
      cookie.name === 'supabase-auth-token'
    );
  });
}
