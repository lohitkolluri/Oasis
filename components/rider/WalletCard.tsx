import { Wallet } from "lucide-react";

interface WalletCardProps {
  balance: number;
  platform: string;
  claimCount: number;
}

export function WalletCard({ balance, platform, claimCount }: WalletCardProps) {
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="h-5 w-5 text-emerald-400" />
        <h2 className="font-semibold">Coverage & Earnings</h2>
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-bold text-zinc-100">
          ₹{balance.toLocaleString("en-IN")}
        </p>
        <p className="text-sm text-zinc-400">
          Total protected payouts this period
        </p>
      </div>
      <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between text-sm text-zinc-500">
        <span>Platform: {platform}</span>
        {claimCount > 0 && (
          <span>{claimCount} automated claim{claimCount !== 1 ? "s" : ""}</span>
        )}
      </div>
    </div>
  );
}
