'use client';

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { adminNavItems } from "./AdminNav";

export function AdminSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const trimmed = query.trim().toLowerCase();

  const suggestions = useMemo(
    () =>
      trimmed.length === 0
        ? []
        : adminNavItems.filter(
            (item: { label: string; href: string }) =>
              item.label.toLowerCase().includes(trimmed) ||
              item.href.toLowerCase().includes(trimmed)
          ),
    [trimmed]
  );

  const goTo = (href: string) => {
    if (!href) return;
    router.push(href);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (suggestions[0]) {
        goTo(suggestions[0].href);
      }
    }
    if (e.key === "Escape") {
      setQuery("");
    }
  };

  return (
    <div className="relative">
      <Search className="h-3.5 w-3.5 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search admin..."
        className="w-56 bg-[#1e1e1e] border border-[#2d2d2d] rounded-full pl-8 pr-5 py-2 text-sm text-white placeholder-[#666666] focus:outline-none focus:border-[#7dd3fc]/40 focus:shadow-[0_0_12px_rgba(125,211,252,0.1)] transition-all duration-200"
      />
      {suggestions.length > 0 && (
        <div className="absolute mt-1 w-64 bg-[#161616] border border-[#2d2d2d] rounded-2xl shadow-xl overflow-hidden z-20">
          <div className="px-3 py-2 border-b border-[#2d2d2d]">
            <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.12em]">
              Quick nav
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {suggestions.map((item: { label: string; href: string }) => (
              <button
                key={item.href}
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm text-[#d4d4d4] hover:bg-[#1e1e1e] flex items-center gap-2"
                // onMouseDown so click works before input loses focus
                onMouseDown={() => goTo(item.href)}
              >
                <span className="text-[11px] text-[#737373]">
                  {item.label}
                </span>
                <span className="ml-auto text-[11px] text-[#404040]">
                  {item.href.replace("/admin", "admin:")}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
