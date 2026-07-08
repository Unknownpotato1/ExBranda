"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/appStore";
import { ArrowRight, Shield, Sparkles, TrendingUp, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isFirebaseConfigured, signInWithGoogle } from "@/lib/firebase-client";

export function LoginScreen() {
  const setUser = useAppStore((s) => s.setUser);
  const setWallet = useAppStore((s) => s.setWallet);
  const setView = useAppStore((s) => s.setView);
  const pendingReferralCode = useAppStore((s) => s.pendingReferralCode);
  const [loading, setLoading] = React.useState<"google" | "admin" | "demo" | null>(null);

  const firebaseReady = isFirebaseConfigured();

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
    setLoading("google");
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
      toast.error(e.message || "Google Sign-In failed");
    } finally {
      setLoading(null);
    }
  };

  // === Mock admin login (dev/demo) ===
  const loginAdminMock = async () => {
    setLoading("admin");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@exbranda.com", role: "admin" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Login failed");
      await finalizeLogin();
    } catch (e: any) {
      toast.error(e.message || "Login failed");
    } finally {
      setLoading(null);
    }
  };

  // === Mock creator login (dev/demo — only when Firebase isn't configured) ===
  const loginCreatorMock = async () => {
    setLoading("demo");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "creator@exbranda.com", role: "user" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Login failed");
      await finalizeLogin();
    } catch (e: any) {
      toast.error(e.message || "Login failed");
    } finally {
      setLoading(null);
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
          <Logo size={36} />
        </header>

        {/* Hero */}
        <main className="flex-1 flex flex-col justify-center px-5 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
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
            className="grid grid-cols-3 gap-2 mb-8"
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
              className="w-full h-13 py-3.5 text-base font-medium rounded-2xl btn-shine glow-primary"
              onClick={loginWithGoogle}
              disabled={!!loading}
            >
              {loading === "google" ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <>
                  <GoogleIcon className="h-5 w-5" />
                  Continue with Google
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>

            {firebaseReady ? (
              <p className="text-center text-[11px] text-muted-foreground">
                Secured by Firebase Authentication • Your Google credentials never touch our servers
              </p>
            ) : (
              <>
                <p className="text-center text-[11px] text-muted-foreground">
                  Firebase not configured — using demo mode
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-xl"
                    onClick={loginCreatorMock}
                    disabled={!!loading}
                  >
                    {loading === "demo" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-1.5" />
                        Demo creator
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-xl"
                    onClick={loginAdminMock}
                    disabled={!!loading}
                  >
                    {loading === "admin" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-1.5 text-amber-500" />
                        Admin login
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            {pendingReferralCode && (
              <p className="text-center text-[11px] text-primary">
                Referred by {pendingReferralCode} — your bonus will activate after first withdrawal.
              </p>
            )}
          </motion.div>

          {/* Trust footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-10 text-center text-[11px] text-muted-foreground"
          >
            By continuing, you agree to our Terms & Privacy Policy.
            <br />
            {firebaseReady ? "Powered by Firebase Auth + Google Sign-In" : "Demo mode — no password required"}
          </motion.div>
        </main>
      </div>
    </div>
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
