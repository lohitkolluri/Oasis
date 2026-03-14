import { Card } from '@/components/ui/Card';
import { ChevronRight, FileCheck, Shield } from 'lucide-react';
import Link from 'next/link';
import type { WeeklyPolicy, ParametricClaim } from '@/lib/types/database';
import { ButtonLink } from '@/components/ui/Button';

interface PolicyCardProps {
  policy: WeeklyPolicy | null;
  profileId: string;
  claims: ParametricClaim[];
  planName?: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function PolicyCard({
  policy,
  profileId: _profileId,
  claims: _claims,
  planName,
}: PolicyCardProps) {

  if (!policy) {
    return (
      <Card
        variant="default"
        padding="md"
        className="rounded-2xl border-white/10 bg-surface-1"
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 shrink-0">
            <FileCheck className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-zinc-400">No active coverage</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Get a weekly policy to enable automatic payouts
            </p>
          </div>
        </div>
        <ButtonLink href="/dashboard/policy" variant="primary" size="sm" className="w-full justify-center">
          Get coverage
        </ButtonLink>
      </Card>
    );
  }

  return (
    <Card variant="default" padding="none" className="rounded-2xl border-white/10 bg-surface-1 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-uber-green/15 border border-uber-green/20 shrink-0">
            <Shield className="h-4 w-4 text-uber-green" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white">
              {planName ?? 'Current policy'}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Coverage & premium</p>
          </div>
        </div>
        <Link
          href="/dashboard/policy"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors min-h-[36px]"
        >
          Manage
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="px-4 pb-4 pt-1">
        <div className="flex items-center justify-between py-2.5 border-b border-white/10">
          <span className="text-[11px] text-zinc-500">Coverage period</span>
          <span className="text-[13px] font-medium text-white tabular-nums">
            {formatDate(policy.week_start_date)} – {formatDate(policy.week_end_date)}
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-[11px] text-zinc-500">Weekly premium</span>
          <span className="text-[13px] font-bold text-white tabular-nums">
            ₹{Number(policy.weekly_premium_inr).toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </Card>
  );
}
