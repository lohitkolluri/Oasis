'use client';

import { SidebarUser } from '@/components/admin/SidebarUser';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';
import {
  Activity,
  BarChart,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileCheck,
  FlaskConical,
  Folder,
  LayoutDashboard,
  Search,
  Smartphone,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';

export function AdminPreviewFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0f0f0f] overflow-hidden">
      {/* Embedded preview sizing (avoid full-page feel) */}
      <div className="relative h-[250px] sm:h-[340px] md:h-[470px] lg:h-[720px] overflow-hidden">
        {/* On mobile, keep the desktop admin layout but scale it down to fit */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 origin-top scale-[0.38] sm:scale-[0.52] md:scale-[0.7] lg:static lg:left-auto lg:translate-x-0 lg:origin-top-left lg:scale-100 w-[1100px] lg:w-full">
          <div className="flex h-[640px] lg:h-[720px]">
            {/* Sidebar (static preview) */}
            <aside className="flex w-[260px] bg-[#161616] border-r border-[#2d2d2d] flex-col">
              <div className="flex items-center gap-2 px-3 py-3 mb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Logo size={28} className="shrink-0" />
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-white leading-tight tracking-tight">
                      Oasis
                    </p>
                    <p className="text-xs text-muted-foreground leading-tight">Admin Console</p>
                  </div>
                </div>
              </div>

              <div className="mx-3 h-px bg-[#2d2d2d]" />

              {/* Nav — static clone of `components/admin/AdminNav.tsx` */}
              <nav className="flex flex-1 flex-col px-2 py-3 overflow-y-auto min-h-0">
                <ul className="space-y-5" aria-label="Admin navigation preview">
                  {/* Operations */}
                  <li>
                    <div
                      className={cn(
                        'flex w-full items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] rounded-md',
                        'text-muted-foreground/60',
                      )}
                    >
                      <span className="truncate">Operations</span>
                      <ChevronRight className="ml-auto h-3 w-3 opacity-40 rotate-90" aria-hidden />
                    </div>
                    <div className="mt-1 space-y-0.5 pl-3">
                      {[
                        { label: 'Overview', Icon: LayoutDashboard, active: true },
                        { label: 'Policies', Icon: FileCheck },
                        { label: 'Triggers', Icon: Zap },
                        { label: 'Riders', Icon: Users },
                      ].map(({ label, Icon, active }) => (
                        <div
                          key={label}
                          className={cn(
                            'flex items-center gap-2 rounded-lg text-[13px] h-8 px-3 transition-colors duration-150',
                            active
                              ? 'bg-white/[0.06] text-white font-medium'
                              : 'text-[#9ca3af] hover:bg-muted/50',
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden />
                          <span className="truncate">{label}</span>
                        </div>
                      ))}
                    </div>
                  </li>

                  {/* Financial */}
                  <li>
                    <div
                      className={cn(
                        'flex w-full items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] rounded-md',
                        'text-muted-foreground/60',
                      )}
                    >
                      <span className="truncate">Financial</span>
                      <ChevronRight className="ml-auto h-3 w-3 opacity-40 rotate-90" aria-hidden />
                    </div>
                    <div className="mt-1 space-y-0.5 pl-3">
                      {[
                        { label: 'Payments', Icon: CreditCard },
                        { label: 'Revenue & Loss', Icon: BarChart },
                        { label: 'Plans & Pricing', Icon: Wallet },
                      ].map(({ label, Icon }) => (
                        <div
                          key={label}
                          className="flex items-center gap-2 rounded-lg text-[13px] h-8 px-3 text-[#9ca3af] hover:bg-muted/50 transition-colors duration-150"
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden />
                          <span className="truncate">{label}</span>
                        </div>
                      ))}
                    </div>
                  </li>

                  {/* Review */}
                  <li>
                    <div
                      className={cn(
                        'flex w-full items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] rounded-md',
                        'text-muted-foreground/60',
                      )}
                    >
                      <span className="truncate">Review</span>
                      <ChevronRight className="ml-auto h-3 w-3 opacity-40 rotate-90" aria-hidden />
                    </div>
                    <div className="mt-1 space-y-0.5 pl-3">
                      <div className="flex items-center gap-2 rounded-lg text-[13px] h-8 px-3 text-[#9ca3af] hover:bg-muted/50 transition-colors duration-150">
                        <ClipboardCheck className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="truncate">Fraud Queue</span>
                      </div>

                      {/* System Health folder (expanded) */}
                      <div className="space-y-0.5">
                        <div
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md text-sm h-9 px-3',
                            'cursor-pointer select-none text-left',
                            'bg-[#111827] text-[#e5e7eb] font-semibold shadow-[0_0_0_1px_rgba(15,23,42,0.8)]',
                          )}
                        >
                          <Folder className="h-4 w-4 shrink-0 text-[#9ca3af]" aria-hidden />
                          <span className="truncate flex-1">System Health</span>
                          <ChevronRight className="h-3 w-3 text-[#4b5563] rotate-90" aria-hidden />
                        </div>
                        <div className="ml-2 border-l border-[#1f2933]">
                          <div className="mt-1 space-y-0.5">
                            {[
                              { label: 'API Health', Icon: Activity },
                              { label: 'System Logs', Icon: ClipboardCheck },
                            ].map(({ label, Icon }) => (
                              <div
                                key={label}
                                className="flex items-center gap-2 rounded-lg text-[13px] h-8 pl-8 pr-3 text-[#e5e7eb] hover:bg-muted/50 transition-colors duration-150"
                              >
                                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                                <span className="truncate">{label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 rounded-lg text-[13px] h-8 px-3 text-[#9ca3af] hover:bg-muted/50 transition-colors duration-150">
                        <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="truncate">Demo</span>
                      </div>
                    </div>
                  </li>
                </ul>
              </nav>

              <div className="mx-3 h-px bg-[#2d2d2d]" />

              <div className="p-3 mt-auto shrink-0">
                <SidebarUser name="John Doe" email="john@example.com" />
              </div>
            </aside>

            {/* Main */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              <header className="sticky top-0 z-10 h-[48px] border-b border-[#2d2d2d] bg-[#0f0f0f] px-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 rounded-lg border border-[#2d2d2d] bg-[#161616] px-3 h-8 w-[280px]">
                  <Search className="h-4 w-4 text-[#666]" />
                  <span className="text-[12px] text-[#666]">Search admin…</span>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <span className="flex items-center gap-1.5 text-xs text-[#555]">
                    <Smartphone className="h-3.5 w-3.5" />
                    Rider App
                  </span>
                </div>
              </header>

              <div className="flex-1 min-h-0 overflow-y-auto">
                <main className="px-5 py-5 lg:px-7 max-w-[1400px] w-full mx-auto">{children}</main>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
