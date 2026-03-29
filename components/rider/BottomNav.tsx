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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-2xl border-t border-white/[0.06] safe-area-pb">
      <div className="max-w-xl mx-auto flex items-stretch justify-around h-16 px-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={`${href}-${label}`}
              href={href}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] transition-colors duration-150 active:scale-95 active:opacity-80"
            >
              {/* Pill-style active indicator behind icon+label */}
              {isActive && (
                <span
                  className="absolute inset-x-2 top-1.5 bottom-1.5 rounded-2xl bg-uber-green/10 pointer-events-none"
                  aria-hidden
                />
              )}
              <Icon
                className={`relative z-[1] h-[22px] w-[22px] shrink-0 transition-colors duration-150 ${
                  isActive ? "text-uber-green" : "text-zinc-500"
                }`}
                strokeWidth={isActive ? 2.2 : 1.6}
              />
              <span
                className={`relative z-[1] text-[10px] font-semibold tracking-wide transition-colors duration-150 ${
                  isActive ? "text-uber-green" : "text-zinc-500"
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
