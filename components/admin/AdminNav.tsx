"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNavItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/triggers", label: "Triggers" },
  { href: "/admin/fraud", label: "Fraud" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2">
      {adminNavItems.map(({ href, label }) => {
        const isActive =
          href === "/admin"
            ? pathname === "/admin" || pathname === "/admin/"
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/50"
            }`}
          >
            {label}
          </Link>
        );
      })}
      <div className="w-px h-5 bg-zinc-700 mx-1" />
      <Link
        href="/dashboard"
        className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 hover:border-emerald-500/50 transition-all"
      >
        Rider app
      </Link>
    </nav>
  );
}
