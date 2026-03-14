'use client';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { adminNavItems } from './AdminNav';

export function AdminSearch() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim().toLowerCase();

  const suggestions = useMemo(
    () =>
      trimmed.length === 0
        ? []
        : adminNavItems.filter(
            (item: { label: string; href: string }) =>
              item.label.toLowerCase().includes(trimmed) ||
              item.href.toLowerCase().includes(trimmed),
          ),
    [trimmed],
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const goTo = (href: string) => {
    if (!href) return;
    router.push(href);
    setQuery('');
    setFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (suggestions[0]) {
        goTo(suggestions[0].href);
      }
    }
    if (e.key === 'Escape') {
      setQuery('');
      setFocused(false);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <Search className="h-3.5 w-3.5 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search admin..."
        className="w-56 rounded-full pl-8 pr-5 h-8 bg-[#1e1e1e] border-[#2d2d2d] text-white placeholder:text-[#666666] focus-visible:border-[#7dd3fc]/40 focus-visible:ring-[#7dd3fc]/20"
      />
      {focused && suggestions.length > 0 && (
        <Card
          variant="default"
          padding="none"
          className="absolute mt-1 w-64 rounded-xl shadow-xl overflow-hidden z-20"
        >
          <div className="px-3 py-2 border-b border-[#2d2d2d]">
            <p className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.12em]">
              Quick nav
            </p>
          </div>
          <ScrollArea className="max-h-64">
            <div className="p-1">
              {suggestions.map((item: { label: string; href: string }) => (
                <button
                  key={item.href}
                  type="button"
                  className="w-full text-left px-3 py-2.5 text-sm text-[#d4d4d4] hover:bg-[#1e1e1e] flex items-center gap-2 rounded-lg transition-colors"
                  onMouseDown={() => goTo(item.href)}
                >
                  <span className="text-[11px] text-[#737373]">{item.label}</span>
                  <span className="ml-auto text-[11px] text-[#404040]">
                    {item.href.replace('/admin', 'admin:')}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
