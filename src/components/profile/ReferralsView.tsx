"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { BackHeader } from "@/components/submissions/SubmitReelView";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Gift,
  Copy,
  Check,
  Share2,
  MessageCircle,
  Instagram,
  Users,
  CircleCheck,
  Clock,
  Sparkles,
} from "lucide-react";

interface ReferralData {
  referralCode: string;
  referralLink: string;
  referralActive: boolean;
  referralBonusPct: number;
  stats: { total: number; active: number; pending: number };
  referrals: {
    id: string;
    status: string;
    bonusType: string;
    bonusValue: number;
    createdAt: string;
    activatedAt: string | null;
    referredName: string | null;
    referredInstagram: string | null;
  }[];
}

export function ReferralsView() {
  const user = useAppStore((s) => s.user);
  const [data, setData] = React.useState<ReferralData | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/referrals")
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch(() => {});
  }, []);

  const copyLink = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const shareWhatsApp = () => {
    if (!data) return;
    const text = `Hey! Join me on ExBranda and earn money by promoting brands in your Reels. Use my referral code: ${data.referralCode}\n${data.referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareInstagram = () => {
    if (!data) return;
    // Try native share, fallback to copy
    if (navigator.share) {
      navigator.share({
        title: "Join ExBranda",
        text: `Use my referral code: ${data.referralCode}`,
        url: data.referralLink,
      }).catch(() => {});
    } else {
      copyLink();
    }
  };

  return (
    <div className="px-3 pb-4">
      <div className="mx-auto max-w-md space-y-4">
        <BackHeader title="Refer & Earn" />

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-chart-1 via-primary to-chart-3 text-white shadow-xl shadow-primary/30"
        >
          <div className="absolute -top-12 -right-8 h-40 w-40 rounded-full bg-white opacity-10" />
          <div className="relative">
            <div className="flex items-center gap-2 text-white/85 text-[11px] font-medium">
              <Gift className="h-3.5 w-3.5" />
              Referral Bonus
            </div>
            <h2 className="text-2xl font-semibold mt-1 leading-tight">+5% earning rate</h2>
            <p className="text-white/80 text-xs mt-1 leading-relaxed">
              Invite creators with your code. When they complete their first withdrawal, you permanently earn +5% on every view.
            </p>
            {data?.referralActive && (
              <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-[11px] font-medium">
                <CircleCheck className="h-3 w-3" />
                Bonus active
              </div>
            )}
          </div>
        </motion.div>

        {/* Referral code */}
        {data && (
          <div className="glass rounded-2xl p-4">
            <div className="text-xs text-muted-foreground mb-1.5">Your referral code</div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-2xl font-semibold tracking-wider">{data.referralCode}</span>
              <Button size="sm" variant="outline" className="h-9 px-3 rounded-lg" onClick={copyLink}>
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2 break-all">{data.referralLink}</div>

            {/* Share buttons */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <Button size="sm" variant="outline" className="h-10 rounded-xl" onClick={shareWhatsApp}>
                <MessageCircle className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                WhatsApp
              </Button>
              <Button size="sm" variant="outline" className="h-10 rounded-xl" onClick={shareInstagram}>
                <Instagram className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                Share
              </Button>
              <Button size="sm" variant="outline" className="h-10 rounded-xl" onClick={copyLink}>
                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                Copy
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-3 gap-2">
            <StatCard icon={Users} label="Invited" value={data.stats.total} />
            <StatCard icon={CircleCheck} label="Active" value={data.stats.active} tone="text-emerald-500" />
            <StatCard icon={Clock} label="Pending" value={data.stats.pending} tone="text-amber-500" />
          </div>
        )}

        {/* How it works */}
        <div className="glass rounded-2xl p-4">
          <div className="text-xs font-semibold mb-3 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            How it works
          </div>
          <ol className="space-y-3">
            <Step n={1} title="Share your code" desc="Send your referral code or link to other creators." />
            <Step n={2} title="They sign up" desc="New users enter your code during onboarding." />
            <Step n={3} title="They withdraw" desc="Their first successful withdrawal activates your bonus." />
            <Step n={4} title="You earn +5%" desc="Every view you get pays 5% more — forever." />
          </ol>
        </div>

        {/* History */}
        {data && data.referrals.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 px-1">
              Referral History
            </h3>
            <div className="space-y-2">
              {data.referrals.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-chart-1/20 to-chart-3/20 flex items-center justify-center text-sm font-semibold">
                    {(r.referredName || "U").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {r.referredInstagram || r.referredName || "Anonymous"}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Joined {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      r.status === "active"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-amber-500/10 text-amber-500"
                    }`}
                  >
                    {r.status === "active" ? "Active" : "Pending"}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="glass rounded-xl p-3 text-center">
      <Icon className={`h-4 w-4 mx-auto mb-1 ${tone || "text-muted-foreground"}`} />
      <div className={`text-lg font-semibold tabular-nums ${tone || ""}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="flex gap-3">
      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
        {n}
      </div>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </li>
  );
}
