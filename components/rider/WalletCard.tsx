import { Wallet } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

interface WalletCardProps {
  balance: number;
  platform: string;
  claimCount: number;
  profileId?: string;
}

export function WalletCard({ balance, platform, claimCount, profileId }: WalletCardProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-900/80 border border-zinc-700/50 p-6 shadow-xl shadow-black/20">
      <div className="flex items-center gap-3 mb-4">
        {profileId ? (
          <Avatar seed={profileId} size={40} />
        ) : (
          <div className="p-2 rounded-xl bg-emerald-500/10">
            <Wallet className="h-5 w-5 text-emerald-400" />
          </div>
        )}
        <h2 className="font-semibold">Coverage & Earnings</h2>
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-bold text-zinc-100 tracking-tight">
          ₹{balance.toLocaleString("en-IN")}
        </p>
        <p className="text-sm text-zinc-500">
          Total protected payouts this period
        </p>
      </div>
      <div className="mt-4 pt-4 border-t border-zinc-800/80 flex justify-between text-sm text-zinc-500">
        <span className="capitalize">Platform: {platform}</span>
        {claimCount > 0 && (
          <span className="text-emerald-400/80">{claimCount} automated claim{claimCount !== 1 ? "s" : ""}</span>
        )}
      </div>
    </div>
  );
}
