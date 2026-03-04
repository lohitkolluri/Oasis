import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, platform, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.platform) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-[#0a0a0a]/95 backdrop-blur-md">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-zinc-100 tracking-tight hover:text-white transition-colors"
          >
            Oasis
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="hidden sm:block text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Admin
            </Link>
            <div className="w-px h-4 bg-zinc-800 hidden sm:block" />
            <Avatar seed={user.id} size={28} className="ring-1 ring-zinc-700/60" />
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-4 py-6 pb-24">{children}</main>
    </div>
  );
}
