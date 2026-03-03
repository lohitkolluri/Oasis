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
      <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-[#0a0a0a]/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight">
          Oasis
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors hidden sm:block"
          >
            Admin
          </Link>
          <div className="flex items-center gap-3 pl-3 border-l border-zinc-800">
            <Avatar seed={user.id} size={36} />
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="p-4 md:p-6 max-w-2xl mx-auto">{children}</main>
    </div>
  );
}
