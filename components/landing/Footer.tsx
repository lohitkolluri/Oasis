import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-[#2d2d2d] bg-[#0f0f0f]">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">Oasis</p>
            <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/60">
              Income protection for delivery partners · weekly cashflows · automated parametric payouts.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 text-[13px] sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">Product</p>
              <Link href="#faq" className="block text-white/70 hover:text-white">
                FAQ
              </Link>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">Access</p>
              <Link href="/login" className="block text-white/70 hover:text-white">
                Sign in
              </Link>
              <Link href="/register" className="block text-white/70 hover:text-white">
                Get started
              </Link>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">Legal</p>
              <span className="block text-white/60">No health/life/accident coverage</span>
              <span className="block text-white/60">No vehicle repair coverage</span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between gap-4 border-t border-[#2d2d2d] pt-6 text-[12px] text-white/50">
          <span>© {new Date().getFullYear()} Oasis</span>
          <span className="hidden sm:inline">Built for DEVTrails hackathon</span>
        </div>
      </div>
    </footer>
  );
}

