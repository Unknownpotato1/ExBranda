"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "@/store/appStore";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  Link as LinkIcon,
  Eye,
  Loader,
  Info,
  CircleCheck,
  Sparkles,
} from "lucide-react";
import { calculatePayout, formatINR, formatNumber, getCurrentRate } from "@/lib/payout";
import { BASE_RATE_PER_10K } from "@/lib/types";

export function SubmitReelView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const triggerCelebrate = useAppStore((s) => s.triggerCelebrate);

  const [reelUrl, setReelUrl] = React.useState("");
  const [currentViews, setCurrentViews] = React.useState<string>("");
  const [notes, setNotes] = React.useState("");
  const [confirmLogo, setConfirmLogo] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Preview: existing approved views for this URL
  const [preview, setPreview] = React.useState<{ previousApproved: number; newViews: number; payout: number } | null>(null);
  const [checkingUrl, setCheckingUrl] = React.useState(false);

  // Debounced check for existing submissions on this URL
  React.useEffect(() => {
    if (!reelUrl || !reelUrl.match(/^https?:\/\/.+/)) {
      setPreview(null);
      return;
    }
    setCheckingUrl(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/submissions?reelUrl=${encodeURIComponent(reelUrl)}`);
        if (r.ok) {
          const j = await r.json();
          setPreview({
            previousApproved: j.previousApproved || 0,
            newViews: j.newViews || 0,
            payout: j.payout || 0,
          });
        }
      } catch {}
      setCheckingUrl(false);
    }, 600);
    return () => clearTimeout(t);
  }, [reelUrl]);

  const views = parseInt(currentViews || "0", 10) || 0;
  const rate = user ? getCurrentRate(user.referralBonusPct) : BASE_RATE_PER_10K;
  const previousApproved = preview?.previousApproved || 0;
  const projectedNewViews = views > previousApproved ? views - previousApproved : 0;
  const projectedPayout = calculatePayout(projectedNewViews, user?.referralBonusPct || 0);
  const valid = views > previousApproved && reelUrl.match(/^https?:\/\/.+/) && confirmLogo;

  const submit = async () => {
    if (!valid) {
      toast.error("Please fill all fields correctly and confirm the logo checkbox");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reelUrl,
          currentViews: views,
          notes: notes.trim() || undefined,
          confirmLogo,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Submission failed");
      toast.success("Reel submitted! Pending admin approval.");
      triggerCelebrate();
      setView("history");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-3 pb-4">
      <div className="mx-auto max-w-md space-y-4">
        <BackHeader title="Submit a Reel" />

        {/* Info banner */}
        <div className="glass rounded-2xl p-3.5 flex gap-2.5 text-xs">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-muted-foreground leading-relaxed">
            Paste your Instagram Reel URL and enter its current view count. We only pay for{" "}
            <span className="text-foreground font-medium">new views</span> since your last approval — never the same views twice.
          </div>
        </div>

        {/* Form */}
        <div className="glass rounded-2xl p-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
              Instagram Reel URL
            </Label>
            <Input
              value={reelUrl}
              onChange={(e) => setReelUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/..."
              className="h-12 rounded-xl text-sm"
              inputMode="url"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              Current Reel Views
            </Label>
            <Input
              value={currentViews}
              onChange={(e) => setCurrentViews(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="e.g. 32000"
              className="h-12 rounded-xl text-sm tabular-nums"
              inputMode="numeric"
            />
            {currentViews && (
              <p className="text-[11px] text-muted-foreground pl-1">
                {formatNumber(views)} views entered
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything you'd like the reviewer to know…"
              className="rounded-xl text-sm min-h-[80px] resize-none"
              maxLength={500}
            />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <Checkbox
              checked={confirmLogo}
              onCheckedChange={(v) => setConfirmLogo(v === true)}
              className="mt-0.5"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              I confirm this reel contains the{" "}
              <span className="text-foreground font-medium">ExBranda logo</span> and follows all community guidelines.
              Fake submissions may result in account suspension.
            </span>
          </label>
        </div>

        {/* Live payout preview */}
        {reelUrl.match(/^https?:\/\/.+/) && views > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 bg-gradient-to-br from-primary/10 to-chart-3/5 border border-primary/20"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Payout Preview
              </div>
              {checkingUrl && <Loader className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>
            {previousApproved > 0 && (
              <div className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
                <CircleCheck className="h-3 w-3 text-emerald-500" />
                This reel has {formatNumber(previousApproved)} previously approved views
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <PreviewStat label="Current" value={formatNumber(views)} />
              <PreviewStat label="New Views" value={formatNumber(projectedNewViews)} accent />
              <PreviewStat label="Est. Payout" value={formatINR(projectedPayout)} accent />
            </div>
            {views > 0 && views <= previousApproved && (
              <div className="mt-3 text-[11px] text-rose-500 bg-rose-500/10 rounded-lg px-2.5 py-1.5">
                Current views must be greater than previously approved views ({formatNumber(previousApproved)}).
              </div>
            )}
            <div className="mt-3 text-[11px] text-muted-foreground">
              Rate: {formatINR(rate)} per 10K views
              {user && user.referralBonusPct > 0 && (
                <span className="text-primary"> • +{user.referralBonusPct}% referral bonus</span>
              )}
            </div>
          </motion.div>
        )}

        <Button
          size="lg"
          className="w-full h-12 rounded-xl btn-shine glow-primary"
          onClick={submit}
          disabled={!valid || submitting}
        >
          {submitting ? (
            <Loader className="h-4.5 w-4.5 animate-spin" />
          ) : (
            <>
              <Upload className="h-4.5 w-4.5 mr-1.5" />
              Submit for review
            </>
          )}
        </Button>

        <p className="text-center text-[11px] text-muted-foreground">
          Submissions are typically reviewed within 24 hours.
        </p>
      </div>
    </div>
  );
}

function PreviewStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-background/60 rounded-xl px-2 py-2 text-center">
      <div className={`text-sm font-semibold tabular-nums ${accent ? "text-primary" : ""}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

export function BackHeader({ title }: { title: string }) {
  const setView = useAppStore((s) => s.setView);
  const goBack = () => {
    // Use history.back() so the history stack stays clean
    if (typeof window !== "undefined" && window.history.state?.view) {
      window.history.back();
    } else {
      setView("dashboard");
    }
  };
  return (
    <div className="flex items-center gap-2 pt-1">
      <button
        onClick={goBack}
        className="h-9 w-9 rounded-xl glass flex items-center justify-center hover:bg-foreground/5"
        aria-label="Back"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
    </div>
  );
}
