import { Wallet } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardHeader } from "@/components/ui/Card";

interface WalletCardProps {
  balance: number;
  platform: string;
  claimCount: number;
  profileId?: string;
}

export function WalletCard({ balance, platform, claimCount, profileId }: WalletCardProps) {
  return (
    <Card variant="elevated" padding="lg">
      <CardHeader
        icon={
          profileId ? (
            <Avatar seed={profileId} size={32} />
          ) : (
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10">
              <Wallet className="h-5 w-5 text-emerald-400" />
            </div>
          )
        }
        title="Coverage & Earnings"
        description="Protected payouts this period"
      />
      <div className="space-y-1">
        <p className="text-3xl font-bold text-zinc-100 tracking-tight tabular-nums">
          ₹{balance.toLocaleString("en-IN")}
        </p>
      </div>
      <div className="mt-5 pt-4 border-t border-zinc-800/60 flex justify-between items-center text-sm">
        <span className="text-zinc-500 capitalize">{platform}</span>
        {claimCount > 0 && (
          <span className="text-emerald-400/90 text-xs font-medium">
            {claimCount} claim{claimCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </Card>
  );
}
