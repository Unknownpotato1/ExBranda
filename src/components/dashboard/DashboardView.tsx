"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { CardSkeleton } from "@/components/common/Skeletons";
import { Button } from "@/components/ui/button";
import {
  Wallet as WalletIcon,
  TrendingUp,
  Clock,
  Download,
  Upload,
  CircleCheck,
  Clock3,
  CircleX,
  Gift,
  BadgeCheck,
  ArrowRight,
} from "lucide-react";
import { formatINR, formatNumber, getCurrentRate } from "@/lib/payout";
import { BASE_RATE_PER_10K } from "@/lib/types";

interface DashboardData {
  wallet: {
    balance: number;
    pendingBalance: number;
    lifetimeEarnings: number;
    withdrawnTotal: number;
    todayEarnings: number;
  };
  stats: { approvedReels: number; pendingReels: number; rejectedReels: number };
}

export function DashboardView() {
  const user = useAppStore((s) => s.user);
  const wallet = useAppStore((s) => s.wallet);
  const setWallet = useAppStore((s) => s.setWallet);
  const setView = useAppStore((s) => s.setView);
  const triggerCelebrate = useAppStore((s) => s.triggerCelebrate);

  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/wallet");
      const j = await r.json();
      if (r.ok) {
        setData(j);
        setWallet(j.wallet);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [setWallet]);

  React.useEffect(() => {
    load();
  }, [load]);

  const rate = user ? getCurrentRate(user.referralBonusPct) : BASE_RATE_PER_10K;
  const referralActive = (user?.referralBonusPct || 0) > 0;

  return (
    <div className="px-3 pb-4">
      <div className="mx-auto max-w-md space-y-4">
        {/* Greeting */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.fullName || "Profile"}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-chart-3 flex items-center justify-center text-white font-semibold text-sm">
                {(user?.fullName || user?.name || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Welcome back,</p>
              <h2 className="text-lg font-semibold tracking-tight">
                {user?.fullName?.split(" ")[0] || user?.name?.split(" ")[0] || "Creator"} 👋
              </h2>
            </div>
          </div>
          {user?.badges && user.badges.length > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full glass">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-medium">{user.badges.length}</span>
            </div>
          )}
        </div>

        {/* Wallet hero card */}
        {loading || !data || !wallet ? (
          <CardSkeleton className="h-44" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-primary/90 via-primary to-blue-800 text-white shadow-xl shadow-primary/30"
          >
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute -top-12 -right-8 h-40 w-40 rounded-full bg-white" />
              <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/50" />
            </div>
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-white/85 text-[11px] font-medium">
                  <WalletIcon className="h-3.5 w-3.5" />
                  Wallet Balance
                </div>
                <button
                  onClick={() => setView("wallet")}
                  className="text-white/80 hover:text-white text-[11px] flex items-center gap-0.5"
                >
                  Details <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
                {formatINR(wallet.balance)}
              </div>
              <div className="mt-1 text-white/80 text-xs">
                +{formatINR(wallet.todayEarnings)} earned today
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <MiniStat label="Pending" value={formatINR(wallet.pendingBalance)} />
                <MiniStat label="Lifetime" value={formatINR(wallet.lifetimeEarnings)} />
                <MiniStat label="Withdrawn" value={formatINR(wallet.withdrawnTotal)} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Pay rate card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass rounded-2xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Current Pay Rate</div>
                <div className="text-sm font-semibold">
                  {formatINR(rate)} <span className="text-muted-foreground font-normal text-xs">/ 10K views</span>
                </div>
              </div>
            </div>
            {referralActive && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                <Gift className="h-3 w-3" />
                +{user?.referralBonusPct}% active
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-3 gap-2 text-center">
            <ReelStat label="Approved" value={data?.stats.approvedReels ?? 0} icon={CircleCheck} tone="text-emerald-500" />
            <ReelStat label="Pending" value={data?.stats.pendingReels ?? 0} icon={Clock3} tone="text-amber-500" />
            <ReelStat label="Rejected" value={data?.stats.rejectedReels ?? 0} icon={CircleX} tone="text-rose-500" />
          </div>
        </motion.div>

        {/* Quick actions */}
        <div className="space-y-2.5">
          <ActionButton
            label="Submit Reel"
            description="Add a new reel for review"
            icon={Upload}
            onClick={() => setView("submit")}
          />
          <ActionButton
            label="Download Logo"
            description="Get the ExBranda logo for your Reels"
            icon={Download}
            onClick={() => setView("download")}
          />
          <ActionButton
            label="Withdraw Money"
            description={`Min ${formatINR(500)} • Instant UPI`}
            icon={WalletIcon}
            onClick={() => setView("withdraw")}
            disabled={wallet ? wallet.balance < 500 : true}
            disabledHint={`Need at least ${formatINR(500)} to withdraw`}
          />
          <ActionButton
            label="Refer & Earn +5%"
            description="Invite creators — bonus activates after first withdrawal"
            icon={Gift}
            onClick={() => setView("referrals")}
          />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/15 rounded-xl px-2 py-2 backdrop-blur-sm">
      <div className="text-[10px] text-white/70 uppercase tracking-wide">{label}</div>
      <div className="text-sm font-semibold mt-0.5 truncate">{value}</div>
    </div>
  );
}

function ReelStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof CircleCheck;
  tone: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <Icon className={`h-4 w-4 ${tone}`} />
      <div className="text-base font-semibold mt-1 tabular-nums">{formatNumber(value)}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function ActionButton({
  label,
  description,
  icon: Icon,
  onClick,
  disabled,
  disabledHint,
}: {
  label: string;
  description: string;
  icon: typeof Upload;
  onClick: () => void;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all text-left glass hover:bg-foreground/[0.03] ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      title={disabled ? disabledHint : undefined}
    >
      <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </motion.button>
  );
}
