"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { BackHeader } from "@/components/submissions/SubmitReelView";
import { ListSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Wallet as WalletIcon,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CircleCheck,
  Receipt,
  Sparkles,
} from "lucide-react";
import { formatINR } from "@/lib/payout";

interface Tx {
  id: string;
  type: "earning" | "withdrawal" | "referral_bonus" | "adjustment";
  amount: number;
  status: string;
  description: string;
  reelUrl: string | null;
  views: number | null;
  createdAt: string;
}

export function WalletView() {
  const wallet = useAppStore((s) => s.wallet);
  const setView = useAppStore((s) => s.setView);
  const [txs, setTxs] = React.useState<Tx[] | null>(null);
  const [filter, setFilter] = React.useState<"all" | "earning" | "withdrawal" | "referral_bonus">("all");

  React.useEffect(() => {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((j) => setTxs(j.transactions || []))
      .catch(() => setTxs([]));
  }, []);

  const filtered = txs?.filter((t) => filter === "all" || t.type === filter) || [];

  return (
    <div className="px-3 pb-4">
      <div className="mx-auto max-w-md space-y-4">
        <BackHeader title="Wallet" />

        {/* Wallet hero */}
        {wallet && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-primary/90 via-primary to-emerald-700 text-white shadow-xl shadow-primary/30"
          >
            <div className="absolute -top-12 -right-8 h-40 w-40 rounded-full bg-white opacity-10" />
            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white opacity-10" />
            <div className="relative">
              <div className="text-[11px] text-white/80 font-medium">Current Balance</div>
              <div className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
                {formatINR(wallet.balance)}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="bg-white/15 rounded-xl px-3 py-2">
                  <div className="text-[10px] text-white/70 uppercase tracking-wide">Pending</div>
                  <div className="text-sm font-semibold mt-0.5">{formatINR(wallet.pendingBalance)}</div>
                </div>
                <div className="bg-white/15 rounded-xl px-3 py-2">
                  <div className="text-[10px] text-white/70 uppercase tracking-wide">Today</div>
                  <div className="text-sm font-semibold mt-0.5">+{formatINR(wallet.todayEarnings)}</div>
                </div>
                <div className="bg-white/15 rounded-xl px-3 py-2">
                  <div className="text-[10px] text-white/70 uppercase tracking-wide">Lifetime</div>
                  <div className="text-sm font-semibold mt-0.5">{formatINR(wallet.lifetimeEarnings)}</div>
                </div>
                <div className="bg-white/15 rounded-xl px-3 py-2">
                  <div className="text-[10px] text-white/70 uppercase tracking-wide">Withdrawn</div>
                  <div className="text-sm font-semibold mt-0.5">{formatINR(wallet.withdrawnTotal)}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1.5 glass rounded-xl p-1">
          {(["all", "earning", "withdrawal", "referral_bonus"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 h-8 rounded-lg text-[11px] font-medium capitalize transition-colors ${
                filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {f === "all" ? "All" : f === "referral_bonus" ? "Bonus" : f}
            </button>
          ))}
        </div>

        {/* Transactions */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 px-1">
            Transactions
          </h3>
          {txs === null ? (
            <ListSkeleton rows={5} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Your earnings and withdrawals will appear here."
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((tx, i) => (
                <TxRow key={tx.id} tx={tx} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TxRow({ tx, index }: { tx: Tx; index: number }) {
  const positive = tx.amount > 0;
  const icon =
    tx.type === "earning"
      ? ArrowDownLeft
      : tx.type === "withdrawal"
      ? ArrowUpRight
      : tx.type === "referral_bonus"
      ? Sparkles
      : TrendingUp;
  const Icon = icon;
  const iconBg =
    tx.type === "earning"
      ? "bg-emerald-500/10 text-emerald-500"
      : tx.type === "withdrawal"
      ? "bg-rose-500/10 text-rose-500"
      : tx.type === "referral_bonus"
      ? "bg-chart-3/15 text-chart-3"
      : "bg-chart-4/15 text-chart-4";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className="glass rounded-xl p-3 flex items-center gap-3"
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{tx.description}</div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
          {new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          <span>•</span>
          <span className="capitalize">{tx.status}</span>
          {tx.views && (
            <>
              <span>•</span>
              <span>{tx.views.toLocaleString()} views</span>
            </>
          )}
        </div>
      </div>
      <div className={`text-sm font-semibold tabular-nums ${positive ? "text-emerald-500" : "text-rose-500"}`}>
        {positive ? "+" : ""}{formatINR(tx.amount)}
      </div>
    </motion.div>
  );
}
