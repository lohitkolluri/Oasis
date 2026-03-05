"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileCheck, Wallet } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/claims", label: "Claims", icon: FileCheck },
  { href: "/dashboard/policy", label: "Policy", icon: Wallet },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0e1118]/96 backdrop-blur-2xl safe-area-pb">
      <div className="max-w-xl mx-auto flex items-end justify-around h-[68px] px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 flex-1 pt-2 pb-3 relative min-w-0"
            >
              {/* M3 indicator pill */}
              <span
                className={`absolute top-1.5 left-1/2 -translate-x-1/2 h-8 w-16 rounded-full transition-all duration-300 ${
                  isActive ? "bg-emerald-500/18" : "bg-transparent"
                }`}
              />
              <Icon
                className={`relative h-5 w-5 shrink-0 transition-colors duration-200 ${
                  isActive ? "text-emerald-400" : "text-[#606880]"
                }`}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span
                className={`relative text-[10px] font-medium tracking-wide transition-colors duration-200 ${
                  isActive ? "text-emerald-400" : "text-[#606880]"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
