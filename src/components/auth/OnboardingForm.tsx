"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/store/appStore";
import { toast } from "sonner";
import { ArrowRight, Instagram, MapPin, User as UserIcon, Wallet, Loader, Sparkles } from "lucide-react";
import { Logo } from "@/components/common/Logo";

const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia",
  "UAE", "Singapore", "Nepal", "Bangladesh", "Sri Lanka", "Other",
];

export function OnboardingForm() {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const setWallet = useAppStore((s) => s.setWallet);
  const pendingReferralCode = useAppStore((s) => s.pendingReferralCode);
  const setPendingReferralCode = useAppStore((s) => s.setPendingReferralCode);
  const setView = useAppStore((s) => s.setView);

  const [fullName, setFullName] = React.useState(user?.name || "");
  const [instagramHandle, setInstagramHandle] = React.useState("");
  const [country, setCountry] = React.useState("India");
  const [upiId, setUpiId] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async () => {
    if (!fullName.trim() || !instagramHandle.trim() || !upiId.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/user/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          instagramHandle: instagramHandle.trim(),
          country,
          upiId: upiId.trim(),
          referredBy: pendingReferralCode,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to onboard");
      // Refresh session
      const me = await fetch("/api/auth/me");
      const meJ = await me.json();
      setUser(meJ.user);
      setWallet(meJ.wallet);
      setPendingReferralCode(null);
      toast.success("Profile saved — welcome to ExBranda!");
      setView("dashboard");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-aurora relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="relative min-h-screen flex flex-col px-5 py-6">
        <div className="mb-6">
          <Logo size={32} showText={false} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass text-[11px] font-medium text-primary mb-3 w-fit">
            <Sparkles className="h-3 w-3" />
            One-time setup
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1.5">Complete your profile</h1>
          <p className="text-sm text-muted-foreground mb-6">
            We need a few details to set up your wallet and start paying you.
          </p>

          <div className="space-y-4">
            <Field
              icon={UserIcon}
              label="Full Name"
              placeholder="e.g. Aarav Sharma"
              value={fullName}
              onChange={setFullName}
            />
            <Field
              icon={Instagram}
              label="Instagram Username"
              placeholder="@yourusername"
              value={instagramHandle}
              onChange={(v) => setInstagramHandle(v.startsWith("@") ? v : `@${v.replace(/^@+/, "")}`)}
              hint="We never post anything to your account."
            />
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Country
              </Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field
              icon={Wallet}
              label="UPI ID"
              placeholder="yourname@okaxis"
              value={upiId}
              onChange={setUpiId}
              hint="Used to send your earnings. You can change this later."
            />
            {pendingReferralCode && (
              <div className="glass rounded-xl p-3 text-xs text-muted-foreground">
                <span className="text-primary font-medium">Referral applied:</span> {pendingReferralCode}
                <br />
                <span className="opacity-80">Bonus activates after your first successful withdrawal.</span>
              </div>
            )}
          </div>

          <Button
            size="lg"
            className="w-full h-12 mt-6 rounded-xl btn-shine glow-primary"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? (
              <Loader className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <>
                Start earning
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </>
            )}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground mt-3">
            You can edit all of this later in your Profile.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
  hint,
}: {
  icon: typeof UserIcon;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-xl"
      />
      {hint && <p className="text-[11px] text-muted-foreground pl-1">{hint}</p>}
    </div>
  );
}
