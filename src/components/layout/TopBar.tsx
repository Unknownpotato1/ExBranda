"use client";

import * as React from "react";
import { useAppStore } from "@/store/appStore";
import { Logo } from "@/components/common/Logo";
import { Bell, Shield, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function TopBar() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const view = useAppStore((s) => s.view);
  const { theme, setTheme } = useTheme();
  const [unread, setUnread] = React.useState(0);
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Fetch unread count
  React.useEffect(() => {
    if (!user) return;
    let active = true;
    const tick = async () => {
      // If user is on the notifications page, don't show the dot
      if (view === "notifications") {
        setUnread(0);
        return;
      }
      try {
        const r = await fetch("/api/notifications");
        const j = await r.json();
        if (!active) return;
        const u = (j.notifications || []).filter((n: any) => !n.read).length;
        setUnread(u);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [user, view]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 pb-2">
      <div className="mx-auto max-w-md">
        <div className="solid rounded-2xl px-3 py-2.5 flex items-center justify-between shadow-sm shadow-black/5">
          <button onClick={() => setView("dashboard")} className="active:scale-95 transition-transform">
            <Logo size={32} />
          </button>
          <div className="flex items-center gap-1">
            {user?.role === "admin" && (
              <button
                onClick={() => setView("admin")}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                aria-label="Admin panel"
              >
                <Shield className="h-4.5 w-4.5" />
              </button>
            )}
            <button
              onClick={toggleTheme}
              className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-foreground/5 transition-colors"
              aria-label="Toggle theme"
            >
              <Sun className="h-4.5 w-4.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4.5 w-4.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </button>
            <button
              onClick={() => setView("notifications")}
              className="relative h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-foreground/5 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary pulse-glow" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
