"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { ListSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import { BackHeader } from "@/components/submissions/SubmitReelView";
import { Button } from "@/components/ui/button";
import {
  Instagram,
  CircleCheck,
  Clock3,
  CircleX,
  Eye,
  TrendingUp,
  Upload,
  ExternalLink,
} from "lucide-react";
import { formatINR, formatNumber } from "@/lib/payout";
import { toast } from "sonner";

interface Submission {
  id: string;
  reelUrl: string;
  currentViews: number;
  previousApprovedViews: number;
  newViews: number;
  approvedViews: number;
  rejectedViews: number;
  payoutAmount: number;
  ratePer10k: number;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  approvedAt: string | null;
}

export function HistoryView() {
  const setView = useAppStore((s) => s.setView);
  const [subs, setSubs] = React.useState<Submission[] | null>(null);
  const [filter, setFilter] = React.useState<"all" | "pending" | "approved" | "rejected">("all");

  React.useEffect(() => {
    fetch("/api/submissions")
      .then((r) => r.json())
      .then((j) => setSubs(j.submissions || []))
      .catch(() => setSubs([]));
  }, []);

  const filtered = subs?.filter((s) => filter === "all" || s.status === filter) || [];

  return (
    <div className="px-3 pb-4">
      <div className="mx-auto max-w-md space-y-4">
        <BackHeader title="Submission History" />

        {/* Filter tabs */}
        <div className="flex gap-1.5 glass rounded-xl p-1">
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 h-8 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {subs === null ? (
          <ListSkeleton rows={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Upload}
            title={filter === "all" ? "No submissions yet" : `No ${filter} submissions`}
            description="Submit your first reel to start earning from your Instagram views."
            action={
              filter === "all" ? (
                <Button onClick={() => setView("submit")} size="sm" className="rounded-xl">
                  <Upload className="h-4 w-4 mr-1.5" />
                  Submit a reel
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((s, i) => (
              <SubmissionCard key={s.id} sub={s} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SubmissionCard({ sub, index }: { sub: Submission; index: number }) {
  const status = sub.status;
  const statusConfig = {
    pending: { icon: Clock3, label: "Pending", color: "text-amber-500", bg: "bg-amber-500/10" },
    approved: { icon: CircleCheck, label: "Approved", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    rejected: { icon: CircleX, label: "Rejected", color: "text-rose-500", bg: "bg-rose-500/10" },
  }[status];

  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className="glass rounded-2xl p-4"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <a
          href={sub.reelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-primary truncate hover:underline"
        >
          <Instagram className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{sub.reelUrl.replace(/^https?:\/\/(www\.)?/, "")}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.bg} ${statusConfig.color} shrink-0`}>
          <StatusIcon className="h-3 w-3" />
          {statusConfig.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat icon={Eye} label="Submitted" value={formatNumber(sub.currentViews)} />
        <Stat icon={CircleCheck} label="Approved" value={formatNumber(sub.approvedViews)} tone="text-emerald-500" />
        <Stat icon={TrendingUp} label="New" value={formatNumber(sub.newViews)} tone="text-primary" />
      </div>

      {status === "approved" && (
        <div className="flex items-center justify-between bg-emerald-500/5 rounded-xl px-3 py-2">
          <span className="text-xs text-muted-foreground">Payout</span>
          <span className="text-sm font-semibold text-emerald-500">+{formatINR(sub.payoutAmount)}</span>
        </div>
      )}
      {status === "rejected" && sub.rejectionReason && (
        <div className="text-xs text-rose-500 bg-rose-500/5 rounded-xl px-3 py-2">
          <span className="font-medium">Reason:</span> {sub.rejectionReason}
        </div>
      )}
      {status === "pending" && (
        <div className="text-xs text-muted-foreground">
          Estimated payout: <span className="text-foreground font-medium">{formatINR(sub.payoutAmount)}</span>
        </div>
      )}

      <div className="mt-2.5 pt-2.5 border-t border-border/50 text-[10px] text-muted-foreground">
        Submitted {new Date(sub.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        {sub.approvedAt && ` • Approved ${new Date(sub.approvedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
      </div>
    </motion.div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="bg-background/40 rounded-xl px-2 py-2">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </div>
      <div className={`text-sm font-semibold tabular-nums ${tone || ""}`}>{value}</div>
    </div>
  );
}
