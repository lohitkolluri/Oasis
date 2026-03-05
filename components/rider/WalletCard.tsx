import { Wallet } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

interface WalletCardProps {
  balance: number;
  platform: string;
  claimCount: number;
  profileId?: string;
}

export function WalletCard({ balance, platform, claimCount }: WalletCardProps) {
  return (
    <div className="rounded-[24px] bg-[#111820] border border-[#1e2535]/70 overflow-hidden">
      {/* Tonal header row */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-[12px] bg-emerald-500/12">
            <Wallet className="h-4.5 w-4.5 text-emerald-400" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-zinc-200">Coverage & Earnings</p>
            <p className="text-[10px] text-[#606880]">Protected payouts</p>
          </div>
        </div>
        {!balance && (
          <ButtonLink href="/dashboard/policy" variant="primary" size="sm">
            Get covered
          </ButtonLink>
        )}
      </div>

      {/* Balance hero */}
      <div className="px-5 pb-5">
        <div className="mt-2 rounded-[16px] bg-gradient-to-br from-emerald-500/8 via-transparent to-transparent border border-emerald-500/10 px-5 py-5">
          <p className="text-[11px] font-semibold text-emerald-400/70 uppercase tracking-[0.12em] mb-1">
            Total payouts
          </p>
          <p className="text-[36px] font-bold text-white tabular-nums tracking-tight leading-none">
            ₹{balance.toLocaleString("en-IN")}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12px] text-[#606880] capitalize font-medium">{platform}</span>
            {claimCount > 0 && (
              <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full font-semibold">
                {claimCount} {claimCount === 1 ? "claim" : "claims"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
