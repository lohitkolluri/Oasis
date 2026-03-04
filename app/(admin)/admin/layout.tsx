import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Smartphone } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({
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

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length > 0) {
    const userEmail = (user.email ?? "").toLowerCase();
    if (!adminEmails.includes(userEmail)) {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-56 border-r border-zinc-800 bg-[#0d0d0d] flex-col z-20 hidden md:flex">
        <div className="h-14 px-4 flex items-center border-b border-zinc-800 shrink-0">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center group-hover:border-violet-500/30 transition-colors">
              <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <span className="text-sm font-semibold text-zinc-200 tracking-tight">
              Oasis Admin
            </span>
          </Link>
        </div>
        <AdminNav />
        <div className="p-3 border-t border-zinc-800 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          >
            <Smartphone className="h-3.5 w-3.5 shrink-0" />
            Rider App
          </Link>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 min-w-0 md:ml-56 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-10 h-14 border-b border-zinc-800 bg-[#0a0a0a]/95 backdrop-blur-md px-4 flex items-center justify-between shrink-0">
          <Link href="/admin" className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <ShieldCheck className="h-4 w-4 text-violet-400" />
            Oasis Admin
          </Link>
          <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Rider App
          </Link>
        </header>
        <main className="flex-1 p-6 lg:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
