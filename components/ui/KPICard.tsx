import Link from 'next/link';

export type KPICardAccent = 'amber' | 'purple' | 'emerald' | 'blue' | 'red' | 'cyan' | 'violet';

const cardBgStyles: Record<KPICardAccent, string> = {
  amber: 'bg-[#c17d3a]/25 border-amber-500/20',
  purple: 'bg-[#7356BF]/25 border-[#7356BF]/30',
  emerald: 'bg-[#3AA76D]/25 border-[#3AA76D]/30',
  blue: 'bg-[#276EF1]/25 border-[#276EF1]/30',
  red: 'bg-[#D44333]/25 border-[#D44333]/30',
  cyan: 'bg-[#0ea5e9]/25 border-[#0ea5e9]/30',
  violet: 'bg-[#a78bfa]/25 border-[#a78bfa]/30',
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
}

export function KPICard({
  title,
  count,
  label,
  value,
  accent,
  href,
  className = '',
}: KPICardProps) {
  const inner = (
    <>
      <p className="text-sm font-medium text-white/95">
        {title}
        {count !== undefined && <span className="text-white/80 font-normal"> ({count})</span>}
      </p>
      <p className="text-xs text-white/60 mt-0.5">{label}</p>
      <p className="text-xl font-bold text-white tabular-nums tracking-tight mt-auto pt-3">
        {value}
      </p>
    </>
  );

  const cardClass = `relative rounded-xl border p-3.5 min-h-[100px] flex flex-col ${cardBgStyles[accent]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {inner}
      </Link>
    );
  }

  return <div className={cardClass}>{inner}</div>;
}
