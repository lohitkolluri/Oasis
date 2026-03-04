"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Zap, ShieldAlert, Users, FileCheck, BarChart2, Activity } from "lucide-react";

const adminNavItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/admin/riders", label: "Riders", icon: Users },
  { href: "/admin/policies", label: "Policies", icon: FileCheck },
  { href: "/admin/triggers", label: "Triggers", icon: Zap },
  { href: "/admin/fraud", label: "Fraud", icon: ShieldAlert },
  { href: "/admin/health", label: "System Health", icon: Activity },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
      <p className="px-3 pt-1 pb-2 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
        Platform
      </p>
      {adminNavItems.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === "/admin"
            ? pathname === "/admin" || pathname === "/admin/"
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? "bg-zinc-800 text-zinc-100 font-medium"
                : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${
                isActive ? "text-zinc-300" : "text-zinc-600"
              }`}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
