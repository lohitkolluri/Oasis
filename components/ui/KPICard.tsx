'use client';

import Link from 'next/link';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BorderBeam } from '@/components/ui/border-beam';

export type KPICardAccent = 'amber' | 'purple' | 'emerald' | 'blue' | 'red' | 'cyan' | 'violet';

const accentRingStyles: Record<KPICardAccent, string> = {
  amber: 'border-amber-500/40 shadow-[0_0_18px_rgba(245,158,11,0.25)]',
  purple: 'border-[#7356BF]/40 shadow-[0_0_18px_rgba(115,86,191,0.25)]',
  emerald: 'border-[#3AA76D]/40 shadow-[0_0_18px_rgba(34,197,94,0.25)]',
  blue: 'border-[#276EF1]/40 shadow-[0_0_18px_rgba(37,99,235,0.25)]',
  red: 'border-[#D44333]/40 shadow-[0_0_18px_rgba(239,68,68,0.25)]',
  cyan: 'border-[#0ea5e9]/40 shadow-[0_0_18px_rgba(14,165,233,0.25)]',
  violet: 'border-[#a78bfa]/40 shadow-[0_0_18px_rgba(167,139,250,0.25)]',
};

export interface KPICardProps {
  title: string;
  count?: number;
  label: string;
  value: string | number;
  accent: KPICardAccent;
  href?: string;
  index?: number;
  className?: string;
  /** Animate numeric value on mount (number or currency string) */
  animateValue?: boolean;
  /** Subtle border beam on card (Magic UI style) */
  showBorderBeam?: boolean;
}

function formatValue(value: string | number): { num: number; prefix?: string; suffix?: string } {
  if (typeof value === 'number') return { num: value };
  const str = String(value).trim();
  const rupee = str.startsWith('₹');
  const pct = str.endsWith('%');
  const num = parseFloat(str.replace(/[₹,%\s]/g, '').replace(/,/g, '')) || 0;
  return { num, prefix: rupee ? '₹' : undefined, suffix: pct ? '%' : undefined };
}

export function KPICard({
  title,
  count,
  label,
  value,
  accent,
  href,
  className = '',
  animateValue = false,
  showBorderBeam = false,
}: KPICardProps) {
  const isNumeric = animateValue && (typeof value === 'number' || /^[₹\d.,\s]+%?$/.test(String(value)));
  const { num, prefix, suffix } = isNumeric ? formatValue(value) : { num: 0, prefix: '', suffix: '' };

  const valueEl = isNumeric ? (
    <p className="text-xl font-bold text-white tabular-nums tracking-tight leading-none">
      <NumberTicker
        value={num}
        prefix={prefix}
        suffix={suffix}
        decimalPlaces={String(value).includes('.') ? 1 : 0}
        className="text-xl font-bold text-white tracking-tight"
      />
    </p>
  ) : (
    <p className="text-xl font-bold text-white tabular-nums tracking-tight leading-none">{value}</p>
  );

  const inner = (
    <>
      <div className="w-full text-center">
        <p className="text-sm font-medium text-white/95 whitespace-nowrap truncate">
          {title}
          {count !== undefined && <span className="text-white/80 font-normal"> ({count})</span>}
        </p>
        <p className="text-xs text-white/60 mt-0.5 whitespace-nowrap truncate">{label}</p>
      </div>
      <div className="flex-1 w-full flex items-center justify-center">
        {valueEl}
      </div>
    </>
  );

  const cardClass = `relative bg-[#161616]/80 backdrop-blur border border-[#2d2d2d] rounded-2xl p-4 h-[110px] flex flex-col items-center overflow-hidden transition-all duration-200 hover:border-[#3a3a3a] hover:shadow-[0_0_22px_rgba(15,23,42,0.85)] ${accentRingStyles[accent]} ${className}`;

  const content = (
    <>
      {showBorderBeam && <BorderBeam size={100} duration={6} />}
      {inner}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {content}
      </Link>
    );
  }

  return <div className={cardClass}>{content}</div>;
}
