"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/appStore";
import { BackHeader } from "@/components/submissions/SubmitReelView";
import { ListSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import { toast } from "sonner";
import {
  Wallet,
  ArrowUpRight,
  Loader,
  Info,
  Clock,
  CircleCheck,
  CircleX,
  ShieldCheck,
} from "lucide-react";
import { formatINR } from "@/lib/payout";
import { MIN_WITHDRAWAL } from "@/lib/types";

interface Withdrawal {
  id: string;
  amount: number;
  upiId: string;
  status: "pending" | "approved" | "rejected" | "paid";
  rejectedReason: string | null;
  paidAt: string | null;
  createdAt: string;
}

export function WithdrawView() {
  const wallet = useAppStore((s) => s.wallet);
  const setWallet = useAppStore((s) => s.setWallet);
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const [amount, setAmount] = React.useState("");
  const [upiId, setUpiId] = React.useState(user?.upiId || "");
  const [submitting, setSubmitting] = React.useState(false);
  const [history, setHistory] = React.useState<Withdrawal[] | null>(null);

  const refresh = React.useCallback(async () => {
    const r = await fetch("/api/withdrawals");
    const j = await r.json();
    setHistory(j.withdrawals || []);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const amt = parseInt(amount || "0", 10) || 0;
  const balance = wallet?.balance || 0;
  const canWithdraw =
    amt >= MIN_WITHDRAWAL &&
    amt <= balance &&
    Number.isInteger(amt) &&
    upiId.trim().length >= 3;

  const submit = async () => {
    if (!canWithdraw) {
      if (amt < MIN_WITHDRAWAL) toast.error(`Minimum withdrawal is ${formatINR(MIN_WITHDRAWAL)}`);
      else if (amt > balance) toast.error("Amount exceeds wallet balance");
      else if (!upiId.trim()) toast.error("Enter your UPI ID");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, upiId: upiId.trim() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      toast.success("Withdrawal requested! Admin will process it shortly.");
      setAmount("");
      // Refresh wallet + history
      const me = await fetch("/api/auth/me");
      const meJ = await me.json();
      setWallet(meJ.wallet);
      refresh();
      setView("wallet");
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-3 pb-4">
      <div className="mx-auto max-w-md space-y-4">
        <BackHeader title="Withdraw Money" />

        {/* Balance card */}
        <div className="glass rounded-2xl p-4">
          <div className="text-xs text-muted-foreground">Available for withdrawal</div>
          <div className="text-3xl font-semibold mt-1 tabular-nums">{formatINR(balance)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Minimum: {formatINR(MIN_WITHDRAWAL)} • No decimals
          </div>
        </div>

        {/* Quick amounts */}
        <div className="grid grid-cols-4 gap-2">
          {[500, 1000, 2000, 5000].map((q) => (
            <button
              key={q}
              onClick={() => setAmount(String(Math.min(q, Math.floor(balance))))}
              disabled={q > balance}
              className={`h-10 rounded-xl text-xs font-medium transition-colors ${
                q > balance
                  ? "glass opacity-50 cursor-not-allowed"
                  : "glass hover:bg-foreground/[0.04]"
              }`}
            >
              ₹{q.toLocaleString()}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
              UPI ID
            </Label>
            <Input
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@okaxis"
              className="h-12 rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Amount (₹)</Label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder={`Min ${MIN_WITHDRAWAL}`}
              className="h-12 rounded-xl text-sm tabular-nums"
              inputMode="numeric"
            />
            {amt > 0 && amt < MIN_WITHDRAWAL && (
              <p className="text-[11px] text-rose-500 pl-1">
                Minimum withdrawal is {formatINR(MIN_WITHDRAWAL)}.
              </p>
            )}
            {amt > balance && (
              <p className="text-[11px] text-rose-500 pl-1">Amount exceeds your balance.</p>
            )}
          </div>
        </div>

        <Button
          size="lg"
          className="w-full h-12 rounded-xl btn-shine glow-primary"
          onClick={submit}
          disabled={!canWithdraw || submitting}
        >
          {submitting ? (
            <Loader className="h-4.5 w-4.5 animate-spin" />
          ) : (
            <>
              <ArrowUpRight className="h-4.5 w-4.5 mr-1.5" />
              Request withdrawal
            </>
          )}
        </Button>

        <div className="glass rounded-2xl p-3.5 flex gap-2.5 text-xs">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-muted-foreground leading-relaxed">
            Withdrawals are processed manually by our team to prevent fraud. Funds typically arrive in your UPI within 24 hours.
          </div>
        </div>

        {/* History */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 px-1">
            Withdrawal History
          </h3>
          {history === null ? (
            <ListSkeleton rows={3} />
          ) : history.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No withdrawals yet"
              description="Your withdrawal requests will appear here."
            />
          ) : (
            <div className="space-y-2">
              {history.map((w, i) => (
                <WithdrawalRow key={w.id} w={w} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WithdrawalRow({ w, index }: { w: Withdrawal; index: number }) {
  const cfg = {
    pending: { icon: Clock, label: "Pending", tone: "text-amber-500", bg: "bg-amber-500/10" },
    approved: { icon: CircleCheck, label: "Approved", tone: "text-emerald-500", bg: "bg-emerald-500/10" },
    paid: { icon: CircleCheck, label: "Paid", tone: "text-emerald-500", bg: "bg-emerald-500/10" },
    rejected: { icon: CircleX, label: "Rejected", tone: "text-rose-500", bg: "bg-rose-500/10" },
  }[w.status];
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className="glass rounded-xl p-3 flex items-center gap-3"
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
        <Icon className={`h-4 w-4 ${cfg.tone}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{formatINR(w.amount)}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {w.upiId} • {new Date(w.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </div>
        {w.rejectedReason && (
          <div className="text-[11px] text-rose-500 mt-0.5">{w.rejectedReason}</div>
        )}
      </div>
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.tone}`}>
        {cfg.label}
      </span>
    </motion.div>
  );
}
