"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/appStore";
import {
  ArrowRight,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Loader2,
  Wallet,
  Lock,
  HelpCircle,
  X,
  Download,
  Upload,
  CircleCheck,
} from "lucide-react";
import { toast } from "sonner";
import { signInWithGoogle } from "@/lib/firebase-client";

export function LoginScreen() {
  const setUser = useAppStore((s) => s.setUser);
  const setWallet = useAppStore((s) => s.setWallet);
  const setView = useAppStore((s) => s.setView);
  const pendingReferralCode = useAppStore((s) => s.pendingReferralCode);
  const [loading, setLoading] = React.useState(false);
  const [showHowItWorks, setShowHowItWorks] = React.useState(false);

  // Finalize login — fetch session and redirect
  const finalizeLogin = async () => {
    const me = await fetch("/api/auth/me");
    const meJ = await me.json();
    if (!meJ.user) throw new Error("Session not created");
    setUser(meJ.user);
    setWallet(meJ.wallet);
    if (meJ.user.role === "admin") setView("admin");
    else setView("dashboard");
    toast.success(`Welcome ${meJ.user.name?.split(" ")[0] || "back"}!`);
  };

  // === Real Google Sign-In via Firebase Auth ===
  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const { idToken } = await signInWithGoogle();
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Login failed");
      await finalizeLogin();
    } catch (e: any) {
      console.error("Google login failed:", e);
      toast.error(e.message || "Google Sign-In failed. Make sure Google Sign-In is enabled in Firebase Console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-aurora relative overflow-hidden">
      {/* Decorative grid + glow */}
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl pointer-events-none animate-float" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-chart-3/20 blur-3xl pointer-events-none animate-float" style={{ animationDelay: "1.5s" }} />

      <div className="relative min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-5 pt-6 pb-4">
          <Logo size={36} showTagline />
        </header>

        {/* Hero */}
        <main className="flex-1 flex flex-col justify-center px-5 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass text-[11px] font-medium text-primary mb-5">
              <Sparkles className="h-3 w-3" />
              Trusted by 12,000+ creators
            </div>
            <h1 className="text-4xl font-semibold tracking-tight leading-[1.1]">
              Turn your Reels into
              <br />
              <span className="gradient-text">real income</span>
            </h1>
            <p className="text-muted-foreground mt-4 text-base max-w-sm mx-auto leading-relaxed">
              Earn ₹100 for every 10,000 views. Promote the ExBranda logo in your Instagram Reels, get approved, and withdraw instantly via UPI.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-3 gap-2 mb-6"
          >
            {[
              { icon: Users, label: "Active creators", value: "12K+" },
              { icon: TrendingUp, label: "Paid out", value: "₹48L+" },
              { icon: Shield, label: "Avg. approval", value: "24h" },
            ].map((s, i) => (
              <div key={i} className="glass rounded-2xl p-3 text-center">
                <s.icon className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <div className="font-semibold text-base">{s.value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-3"
          >
            <Button
              size="lg"
              className="w-full h-13 py-3.5 text-base font-medium rounded-2xl btn-shine glow-primary bg-primary text-primary-foreground hover:brightness-110"
              onClick={loginWithGoogle}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <>
                  <GoogleIcon className="h-5 w-5" />
                  Continue with Google
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>

            {/* How it works button */}
            <button
              onClick={() => setShowHowItWorks(true)}
              className="w-full h-11 rounded-xl glass flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              How it works
            </button>

            {pendingReferralCode && (
              <p className="text-center text-[11px] text-primary">
                Referred by {pendingReferralCode} — your bonus will activate after first withdrawal.
              </p>
            )}
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 grid grid-cols-2 gap-2"
          >
            {[
              { icon: ShieldCheck, label: "Secure Google Sign-In" },
              { icon: Shield, label: "Manual Fraud Protection" },
              { icon: Wallet, label: "UPI Withdrawals" },
              { icon: Lock, label: "Firebase Secured" },
            ].map((b, i) => (
              <div key={i} className="glass rounded-xl p-2.5 flex items-center gap-2">
                <b.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-[10px] font-medium leading-tight">{b.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Footer text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 text-center text-[11px] text-muted-foreground"
          >
            By continuing, you agree to our Terms & Privacy Policy.
            <br />
            Powered by Firebase Auth + Google Sign-In
          </motion.div>
        </main>
      </div>

      {/* How it works — bottom sheet */}
      <AnimatePresence>
        {showHowItWorks && (
          <HowItWorksSheet onClose={() => setShowHowItWorks(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function HowItWorksSheet({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: Download,
      title: "Download the Logo",
      desc: "Get the ExBranda logo and add it to your Instagram Reel. Keep it visible for the full length of your video.",
    },
    {
      icon: Upload,
      title: "Submit Your Reel",
      desc: "Paste your Instagram Reel URL and enter the current view count. We automatically calculate only the new views you haven't been paid for.",
    },
    {
      icon: ShieldCheck,
      title: "Get Approved",
      desc: "Our team manually reviews each submission within 24 hours. Once approved, earnings are instantly credited to your wallet.",
    },
    {
      icon: Wallet,
      title: "Withdraw via UPI",
      desc: "Once you reach ₹500 in your wallet, request a withdrawal to your UPI ID. Payment is processed within 24 hours.",
    },
  ];

  const faqs = [
    { q: "How much can I earn?", a: "₹100 for every 10,000 new views. With a referral bonus active, you earn ₹105 per 10,000 views." },
    { q: "Can I submit the same reel twice?", a: "Yes! But we only pay for new views. If your reel already had 15,000 approved views and now has 32,000, you get paid for the 17,000 new views." },
    { q: "When do I get paid?", a: "After admin approval, money moves to your wallet instantly. Withdrawals to UPI are processed within 24 hours." },
    { q: "What's the referral bonus?", a: "Invite other creators with your referral code. When they complete their first withdrawal, you permanently earn +5% on every view." },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-background w-full max-w-md max-h-[85vh] overflow-y-auto slim-scroll rounded-t-3xl sm:rounded-3xl p-5 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex items-center justify-between">
          <div className="h-1 w-10 rounded-full bg-foreground/15 sm:hidden" />
          <h2 className="text-lg font-semibold">How ExBranda Works</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-foreground/5 flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                {i < steps.length - 1 && <div className="w-px flex-1 bg-border mt-1 min-h-[12px]" />}
              </div>
              <div className="flex-1 pb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-primary">STEP {i + 1}</span>
                </div>
                <h3 className="text-sm font-semibold mt-0.5">{s.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-border/40" />

        {/* Quick FAQ */}
        <div>
          <h3 className="text-sm font-semibold mb-2.5 flex items-center gap-1.5">
            <CircleCheck className="h-4 w-4 text-primary" />
            Quick Answers
          </h3>
          <div className="space-y-2.5">
            {faqs.map((f, i) => (
              <div key={i} className="glass rounded-xl p-3">
                <div className="text-xs font-semibold">{f.q}</div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{f.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Button
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold"
          onClick={onClose}
        >
          Got it — let's start earning
        </Button>
      </motion.div>
    </motion.div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09a7.68 7.68 0 010-4.68V6.57H2.18a11.01 11.01 0 000 9.86l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.84l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335"/>
    </svg>
  );
}
