import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
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

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <Link href="/admin" className="text-xl font-bold">
          Oasis Admin
        </Link>
        <AdminNav />
      </header>
      <main className="p-4 md:p-6 max-w-6xl mx-auto">{children}</main>
    </div>
  );
}
