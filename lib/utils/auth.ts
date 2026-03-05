/**
 * Admin access: user is admin if their email is in ADMIN_EMAILS (.env) or their profile.role is 'admin'.
 * Only admins can access /admin; riders must not see admin options.
 */

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export type UserLike = { email?: string | null };
export type ProfileLike = { role?: string | null };

/**
 * Returns true if the user is allowed to access the admin panel.
 * - Email in ADMIN_EMAILS (from .env), or
 * - profile.role === 'admin' (set by an existing admin via dashboard).
 */
export function isAdmin(user: UserLike | null, profile?: ProfileLike | null): boolean {
  if (!user?.email) return false;
  const email = user.email.trim().toLowerCase();
  const adminEmails = getAdminEmails();
  if (adminEmails.includes(email)) return true;
  if (profile?.role === "admin") return true;
  return false;
}
