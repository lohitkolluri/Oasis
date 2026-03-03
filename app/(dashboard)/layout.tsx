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
    <div className="min-h-screen bg-[#0a0a0a] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(5,150,105,0.06),transparent)]">
      <header className="sticky top-0 z-10 border-b border-zinc-800/60 bg-[#0a0a0a]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-lg font-bold tracking-tight text-zinc-100 hover:text-white transition-colors"
        >
          Oasis
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="hidden sm:flex items-center px-3 py-1.5 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
          >
            Admin
          </Link>
          <div className="flex items-center gap-3 pl-3 ml-1 border-l border-zinc-800">
            <Avatar seed={user.id} size={32} className="ring-1 ring-zinc-700/50" />
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-1"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="p-4 md:p-6 max-w-xl mx-auto pb-24">{children}</main>
    </div>
  );
}
