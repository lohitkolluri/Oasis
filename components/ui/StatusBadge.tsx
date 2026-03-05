interface StatusBadgeProps {
  status: 'low' | 'medium' | 'high' | 'active' | 'expired' | 'pending' | 'approved' | 'rejected' | 'healthy' | 'warning' | 'degraded';
  label?: string;
  pulse?: boolean;
}

const STATUS_STYLES: Record<string, { badge: string; dot?: string; pulse?: string }> = {
  low: {
    badge: 'bg-[#262626] text-[#737373] border border-[#3a3a3a]',
    dot: 'bg-[#737373]',
  },
  medium: {
    badge: 'bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20',
    dot: 'bg-[#7dd3fc]',
    pulse: 'animate-neon-pulse',
  },
  high: {
    badge: 'bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20',
    dot: 'bg-[#a78bfa]',
    pulse: 'animate-violet-pulse',
  },
  active: {
    badge: 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20',
    dot: 'bg-[#22c55e]',
  },
  expired: {
    badge: 'bg-[#262626] text-[#666666] border border-[#3a3a3a]',
    dot: 'bg-[#666666]',
  },
  pending: {
    badge: 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20',
    dot: 'bg-[#f59e0b]',
  },
  approved: {
    badge: 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20',
  },
  rejected: {
    badge: 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20',
  },
  healthy: {
    badge: 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20',
    dot: 'bg-[#22c55e]',
  },
  warning: {
    badge: 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20',
    dot: 'bg-[#f59e0b]',
  },
  degraded: {
    badge: 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20',
    dot: 'bg-[#ef4444]',
  },
};

export function StatusBadge({ status, label, pulse = false }: StatusBadgeProps) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.low;
  const displayLabel = label ?? status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full ${styles.badge}`}>
      {styles.dot && (
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${styles.dot} ${pulse && styles.pulse ? styles.pulse : ''}`} />
      )}
      {displayLabel}
    </span>
  );
}
