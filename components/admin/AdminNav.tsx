"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart2,
  FileCheck,
  FlaskConical,
  LayoutDashboard,
  ShieldAlert,
  Users,
  Zap,
} from "lucide-react";

export const adminNavItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/admin/riders", label: "Riders", icon: Users },
  { href: "/admin/policies", label: "Policies", icon: FileCheck },
  { href: "/admin/triggers", label: "Triggers", icon: Zap },
  { href: "/admin/demo", label: "Demo", icon: FlaskConical },
  { href: "/admin/fraud", label: "Fraud Queue", icon: ShieldAlert },
  { href: "/admin/health", label: "System Health", icon: Activity },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      <p className="px-3 pb-3 text-[10px] font-medium text-[#666666] uppercase tracking-[0.12em]">
        Navigation
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
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              isActive
                ? "bg-[#1e1e1e] text-white border-l-2 border-[#7dd3fc] pl-[10px]"
                : "text-[#737373] hover:text-white hover:bg-[#1e1e1e]"
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 transition-colors ${
                isActive ? "text-[#7dd3fc]" : "text-[#666666] group-hover:text-white"
              }`}
            />
            <span>{label}</span>
            {isActive && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#7dd3fc] opacity-70" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
