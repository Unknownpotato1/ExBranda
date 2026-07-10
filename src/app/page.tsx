"use client";

import * as React from "react";
import { useAppStore } from "@/store/appStore";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { AppShell } from "@/components/layout/AppShell";

export default function Page() {
  const user = useAppStore((s) => s.user);
  const isLoadingAuth = useAppStore((s) => s.isLoadingAuth);
  const setUser = useAppStore((s) => s.setUser);
  const setWallet = useAppStore((s) => s.setWallet);
  const setLoadingAuth = useAppStore((s) => s.setLoadingAuth);
  const pendingReferralCode = useAppStore((s) => s.pendingReferralCode);
  const setPendingReferralCode = useAppStore((s) => s.setPendingReferralCode);

  // Capture referral code from URL on first load
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setPendingReferralCode(ref.toUpperCase());
      // Clean URL (keep history tidy)
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [setPendingReferralCode]);

  // Bootstrap session
  React.useEffect(() => {
    let active = true;
    setLoadingAuth(true);
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null, wallet: null }))
      .then((j) => {
        if (!active) return;
        setUser(j.user);
        setWallet(j.wallet);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setWallet(null);
      })
      .finally(() => {
        if (!active) return;
        setLoadingAuth(false);
      });
    return () => {
      active = false;
    };
  }, [setUser, setWallet, setLoadingAuth]);

  // Loading splash
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-aurora flex flex-col items-center justify-center">
        <div className="bg-grid absolute inset-0 opacity-30 pointer-events-none" />
        <div className="relative">
          <img
            src="/icon.jpg"
            alt="ExBranda"
            className="h-12 w-12 rounded-2xl object-cover animate-pulse-glow"
          />
        </div>
        <div className="text-xs text-muted-foreground mt-4">Loading ExBranda…</div>
      </div>
    );
  }

  // Not logged in → login screen
  if (!user) {
    return <LoginScreen />;
  }

  // Logged in but not onboarded → onboarding
  const isOnboarded =
    user.role === "admin" ||
    (user.fullName && user.instagramHandle && user.country && user.upiId);

  if (!isOnboarded) {
    return <OnboardingForm />;
  }

  // Fully logged in → app shell
  return <AppShell />;
}
