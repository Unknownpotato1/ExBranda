"use client";

import * as React from "react";
import { useAppStore } from "@/store/appStore";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { AnnouncementBanner } from "./AnnouncementBanner";
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
import { ContactView } from "@/components/info/ContactView";
import { LegalView } from "@/components/info/LegalView";
import { LeaderboardView } from "@/components/info/LeaderboardView";
import { AdminPanel } from "@/components/admin/AdminPanel";

export function AppShell() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const celebrate = useAppStore((s) => s.celebrate);
  const clearCelebrate = useAppStore((s) => s.clearCelebrate);
  const { theme, setTheme } = useTheme();
  const storedTheme = useAppStore((s) => s.theme);
  const [scrolled, setScrolled] = React.useState(false);

  // Apply persisted theme preference on mount (intentionally run once)
  React.useEffect(() => {
    if (storedTheme && storedTheme !== theme) setTheme(storedTheme);
  }, []);

  // Track scroll for subtle top bar effect
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isAdminView = view === "admin";

  return (
    <div className="min-h-screen bg-aurora">
      <AnnouncementBanner />
      <TopBar />

      <main className="pt-2 pb-28">
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

      {!isAdminView && <BottomNav />}

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
    case "contact": return <ContactView />;
    case "legal": return <LegalView />;
    case "leaderboard": return <LeaderboardView />;
    case "admin": return <AdminPanel />;
    default: return <DashboardView />;
  }
}
