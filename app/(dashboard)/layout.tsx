import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

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

  // Check if profile exists and has platform (onboarding complete)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, platform")
    .eq("id", user.id)
    .single();

  if (!profile?.platform) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold">
          Oasis
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Admin
          </Link>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="p-4 md:p-6 max-w-2xl mx-auto">{children}</main>
    </div>
  );
}
