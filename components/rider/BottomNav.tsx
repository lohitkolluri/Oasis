"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileCheck, Wallet, Banknote } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/claims", label: "Claims", icon: FileCheck },
  { href: "/dashboard/policy", label: "Policy", icon: Wallet },
  { href: "/dashboard/wallet", label: "Wallet", icon: Banknote },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-2xl safe-area-pb">
      <div className="max-w-xl mx-auto flex items-end justify-around h-[68px] px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={`${href}-${label}`}
              href={href}
              className="flex flex-col items-center gap-1 flex-1 pt-2 pb-3 min-w-0 min-h-[44px] justify-center transition-colors duration-200"
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${
                  isActive ? "text-white" : "text-zinc-500"
                }`}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span
                className={`text-[10px] font-medium tracking-wide ${
                  isActive ? "text-white" : "text-zinc-500"
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
