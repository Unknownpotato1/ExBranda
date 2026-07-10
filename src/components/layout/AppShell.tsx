"use client";

import * as React from "react";
import { useAppStore, type ViewName } from "@/store/appStore";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";
import { InstallPrompt } from "./InstallPrompt";
import { Confetti } from "@/components/common/Confetti";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

import { DashboardView } from "@/components/dashboard/DashboardView";
import { SubmitReelView } from "@/components/submissions/SubmitReelView";
import { DownloadLogoView } from "@/components/submissions/DownloadLogoView";
import { HistoryView } from "@/components/submissions/HistoryView";
import { WalletView } from "@/components/wallet/WalletView";
import { WithdrawView } from "@/components/wallet/WithdrawView";
import { ProfileView } from "@/components/profile/ProfileView";
import { SettingsView } from "@/components/profile/SettingsView";
import { ReferralsView } from "@/components/profile/ReferralsView";
import { NotificationsView } from "@/components/info/NotificationsView";
import { FAQView } from "@/components/info/FAQView";
import { ChatView } from "@/components/info/ChatView";
import { LegalView } from "@/components/info/LegalView";
import { AdminPanel } from "@/components/admin/AdminPanel";

export function AppShell() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const setViewInternal = useAppStore((s) => s.setViewInternal);
  const celebrate = useAppStore((s) => s.celebrate);
  const clearCelebrate = useAppStore((s) => s.clearCelebrate);
  const { theme, setTheme } = useTheme();
  const storedTheme = useAppStore((s) => s.theme);

  // Apply persisted theme preference on mount (intentionally run once)
  // Map any legacy "system" value to "dark" (our new default)
  React.useEffect(() => {
    const effective = storedTheme === "system" ? "dark" : storedTheme;
    if (effective && effective !== theme) setTheme(effective);
  }, []);

  // Handle phone back button / browser back — navigate within the app
  React.useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const state = e.state as { view?: string } | null;
      if (state?.view) {
        setViewInternal(state.view as ViewName);
      } else {
        // No state — go back to dashboard
        setViewInternal("dashboard");
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [setViewInternal]);

  const isAdminView = view === "admin";

  return (
    <div className="min-h-screen bg-aurora">
      <TopBar />

      <main className="pt-2 pb-28 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <ViewRouter view={view} setView={setView} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer — only on dashboard, not on admin/forms */}
      {(view === "dashboard" || view === "faq" || view === "legal" || view === "chat") && (
        <div className="pb-24">
          <Footer />
        </div>
      )}

      {!isAdminView && <BottomNav />}

      {!isAdminView && <InstallPrompt />}

      <Confetti active={celebrate} onDone={clearCelebrate} />
    </div>
  );
}

function ViewRouter({
  view,
  setView,
}: {
  view: string;
  setView: (v: any) => void;
}) {
  switch (view) {
    case "dashboard": return <DashboardView />;
    case "submit": return <SubmitReelView />;
    case "download": return <DownloadLogoView />;
    case "withdraw": return <WithdrawView />;
    case "wallet": return <WalletView />;
    case "history": return <HistoryView />;
    case "profile": return <ProfileView />;
    case "settings": return <SettingsView />;
    case "referrals": return <ReferralsView />;
    case "notifications": return <NotificationsView />;
    case "faq": return <FAQView />;
    case "chat": return <ChatView />;
    case "legal": return <LegalView />;
    case "admin": return <AdminPanel />;
    default: return <DashboardView />;
  }
}

