"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { BackHeader } from "@/components/submissions/SubmitReelView";
import { ListSkeleton } from "@/components/common/Skeletons";
import { Trophy, Crown, Medal, Award, Lock } from "lucide-react";
import { formatINR } from "@/lib/payout";

interface Leader {
  rank: number;
  id: string;
  name: string;
  instagram: string | null;
  lifetimeEarnings: number | null;
  hidden: boolean;
}

export function LeaderboardView() {
  const [leaders, setLeaders] = React.useState<Leader[] | null>(null);
  const user = useAppStore((s) => s.user);

  React.useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((j) => setLeaders(j.leaderboard || []))
      .catch(() => setLeaders([]));
  }, []);

  const podium = leaders?.slice(0, 3) || [];
  const rest = leaders?.slice(3) || [];

  return (
    <div className="px-3 pb-4">
      <div className="mx-auto max-w-md space-y-4">
        <BackHeader title="Leaderboard" />

        {/* Time filter (mock) */}
        <div className="flex gap-1.5 glass rounded-xl p-1">
          {["Monthly", "All-time"].map((t, i) => (
            <button
              key={t}
              className={`flex-1 h-8 rounded-lg text-xs font-medium transition-colors ${
                i === 0 ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Podium */}
        {leaders === null ? (
          <ListSkeleton rows={3} />
        ) : leaders.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <Trophy className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <div className="text-sm font-medium">No data yet</div>
            <div className="text-xs text-muted-foreground mt-1">Be the first to earn!</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 items-end">
              {podium[1] && <PodiumCard leader={podium[1]} place={2} height="h-24" />}
              {podium[0] && <PodiumCard leader={podium[0]} place={1} height="h-32" />}
              {podium[2] && <PodiumCard leader={podium[2]} place={3} height="h-20" />}
            </div>

            {/* Rest */}
            {rest.length > 0 && (
              <div className="space-y-2">
                {rest.map((l, i) => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`glass rounded-xl p-3 flex items-center gap-3 ${
                      user?.id === l.id ? "ring-1 ring-primary" : ""
                    }`}
                  >
                    <div className="w-7 text-center text-sm font-semibold text-muted-foreground">
                      {l.rank}
                    </div>
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/20 to-chart-3/20 flex items-center justify-center text-sm font-semibold">
                      {l.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {l.name} {user?.id === l.id && <span className="text-[10px] text-primary">(You)</span>}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{l.instagram}</div>
                    </div>
                    <div className="text-sm font-semibold tabular-nums">
                      {l.hidden ? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          Hidden
                        </span>
                      ) : (
                        formatINR(l.lifetimeEarnings || 0)
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
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
  leader: Leader;
  place: 1 | 2 | 3;
  height: string;
}) {
  const cfg = {
    1: { icon: Crown, color: "from-amber-400 to-yellow-500", ring: "ring-amber-400/40" },
    2: { icon: Medal, color: "from-slate-300 to-slate-400", ring: "ring-slate-300/40" },
    3: { icon: Award, color: "from-orange-400 to-amber-600", ring: "ring-orange-400/40" },
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
        <Icon className={`h-4 w-4 mb-0.5 ${
          place === 1 ? "text-amber-500" : place === 2 ? "text-slate-400" : "text-orange-500"
        }`} />
        <div className="text-xs font-semibold">#{place}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {leader.hidden ? "—" : formatINR(leader.lifetimeEarnings || 0)}
        </div>
      </div>
    </motion.div>
  );
}
