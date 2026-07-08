"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { BackHeader } from "@/components/submissions/SubmitReelView";
import { Crown, Medal, Award, TrendingUp } from "lucide-react";
import { formatINR } from "@/lib/payout";

// Top 10 creators — ranked by earnings in the last 30 days
const TOP_CREATORS = [
  { name: "Aarav Sharma", instagram: "@aarav.creates", earnings: 96533 },
  { name: "Diya Patel", instagram: "@diya.reels", earnings: 87210 },
  { name: "Vihaan Reddy", instagram: "@vihaan.vibes", earnings: 74890 },
  { name: "Ananya Iyer", instagram: "@ananya.creates", earnings: 65440 },
  { name: "Arjun Mehta", instagram: "@arjun.shoots", earnings: 52100 },
  { name: "Ishaan Gupta", instagram: "@ishaan.films", earnings: 43870 },
  { name: "Saanvi Nair", instagram: "@saanvi.reels", earnings: 38520 },
  { name: "Kabir Singh", instagram: "@kabir.creates", earnings: 29340 },
  { name: "Myra Verma", instagram: "@myra.vibes", earnings: 21780 },
  { name: "Reyansh Kumar", instagram: "@reyansh.shoots", earnings: 15640 },
] as const;

export function LeaderboardView() {
  const user = useAppStore((s) => s.user);
  const wallet = useAppStore((s) => s.wallet);

  const podium = TOP_CREATORS.slice(0, 3);
  const rest = TOP_CREATORS.slice(3);

  return (
    <div className="px-3 pb-4">
      <div className="mx-auto max-w-md space-y-4">
        <BackHeader title="Leaderboard" />

        {/* Period label */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          Top earners in the last 30 days
        </div>

        {/* Podium */}
        <div className="grid grid-cols-3 gap-2 items-end">
          <PodiumCard leader={podium[1]} place={2} height="h-24" />
          <PodiumCard leader={podium[0]} place={1} height="h-32" />
          <PodiumCard leader={podium[2]} place={3} height="h-20" />
        </div>

        {/* Rest */}
        <div className="space-y-2">
          {rest.map((l, i) => (
            <motion.div
              key={l.instagram}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass rounded-xl p-3 flex items-center gap-3"
            >
              <div className="w-7 text-center text-sm font-semibold text-muted-foreground">
                {i + 4}
              </div>
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/20 to-chart-3/20 flex items-center justify-center text-sm font-semibold">
                {l.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{l.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">{l.instagram}</div>
              </div>
              <div className="text-sm font-semibold tabular-nums text-emerald-500">
                {formatINR(l.earnings)}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Your rank */}
        {user && wallet && (
          <div className="glass rounded-xl p-3 flex items-center gap-3 ring-1 ring-primary/30">
            <div className="w-7 text-center text-sm font-semibold text-primary">—</div>
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-chart-3 flex items-center justify-center text-sm font-semibold text-white">
              {(user.fullName || user.name || "U").charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {user.fullName || user.name} <span className="text-[10px] text-primary">(You)</span>
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {user.instagramHandle || "Keep creating to climb!"}
              </div>
            </div>
            <div className="text-sm font-semibold tabular-nums">
              {formatINR(wallet.lifetimeEarnings)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PodiumCard({
  leader,
  place,
  height,
}: {
  leader: { name: string; instagram: string; earnings: number };
  place: 1 | 2 | 3;
  height: string;
}) {
  const cfg = {
    1: { icon: Crown, color: "from-amber-400 to-yellow-500", ring: "ring-amber-400/40", text: "text-amber-500" },
    2: { icon: Medal, color: "from-slate-300 to-slate-400", ring: "ring-slate-300/40", text: "text-slate-400" },
    3: { icon: Award, color: "from-orange-400 to-amber-600", ring: "ring-orange-400/40", text: "text-orange-500" },
  }[place];
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: place * 0.08 }}
      className="flex flex-col items-center"
    >
      <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${cfg.color} flex items-center justify-center text-white font-semibold mb-1.5 ring-4 ${cfg.ring}`}>
        {leader.name.charAt(0)}
      </div>
      <div className="text-xs font-medium truncate max-w-full px-1">{leader.name.split(" ")[0]}</div>
      <div className="text-[10px] text-muted-foreground truncate max-w-full px-1">{leader.instagram}</div>
      <div className={`mt-1.5 w-full ${height} glass rounded-t-xl flex flex-col items-center justify-start pt-2 relative`}>
        <Icon className={`h-4 w-4 mb-0.5 ${cfg.text}`} />
        <div className="text-xs font-semibold">#{place}</div>
        <div className="text-[10px] text-emerald-500 font-medium mt-0.5">
          {formatINR(leader.earnings)}
        </div>
      </div>
    </motion.div>
  );
}
