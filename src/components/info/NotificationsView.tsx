"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { BackHeader } from "@/components/submissions/SubmitReelView";
import { ListSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Bell,
  CircleCheck,
  CircleX,
  Gift,
  Sparkles,
  Megaphone,
  ArrowUpRight,
} from "lucide-react";

const ICONS: Record<string, { icon: typeof Bell; tone: string; bg: string }> = {
  submission_approved: { icon: CircleCheck, tone: "text-emerald-500", bg: "bg-emerald-500/10" },
  submission_rejected: { icon: CircleX, tone: "text-rose-500", bg: "bg-rose-500/10" },
  withdrawal_paid: { icon: ArrowUpRight, tone: "text-emerald-500", bg: "bg-emerald-500/10" },
  withdrawal_approved: { icon: CircleCheck, tone: "text-emerald-500", bg: "bg-emerald-500/10" },
  referral_activated: { icon: Gift, tone: "text-chart-3", bg: "bg-chart-3/15" },
  bonus_increased: { icon: Sparkles, tone: "text-chart-4", bg: "bg-chart-4/15" },
  broadcast: { icon: Megaphone, tone: "text-primary", bg: "bg-primary/10" },
};

export function NotificationsView() {
  const [items, setItems] = React.useState<any[] | null>(null);

  const load = React.useCallback(async () => {
    const r = await fetch("/api/notifications");
    const j = await r.json();
    setItems(j.notifications || []);
    // Mark as read
    await fetch("/api/notifications", { method: "PATCH" });
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="px-3 pb-4">
      <div className="mx-auto max-w-md space-y-4">
        <BackHeader title="Notifications" />

        {items === null ? (
          <ListSkeleton rows={4} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You'll see updates here when your reels are approved, withdrawals are paid, and more."
          />
        ) : (
          <div className="space-y-2">
            {items.map((n, i) => {
              const cfg = ICONS[n.type] || ICONS.broadcast;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`glass rounded-xl p-3 flex items-start gap-3 ${!n.read ? "ring-1 ring-primary/30" : ""}`}
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon className={`h-4 w-4 ${cfg.tone}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
