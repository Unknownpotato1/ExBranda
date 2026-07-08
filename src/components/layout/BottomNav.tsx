"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { House, Upload, Wallet, History } from "lucide-react";
import { useAppStore, ViewName } from "@/store/appStore";
import { cn } from "@/lib/utils";

const items: { id: ViewName; label: string; icon: typeof House }[] = [
  { id: "dashboard", label: "Home", icon: House },
  { id: "submit", label: "Submit", icon: Upload },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "history", label: "History", icon: History },
  // Profile is rendered separately as the 5th item (avatar, not icon)
];

export function BottomNav() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const user = useAppStore((s) => s.user);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
      <div className="mx-auto max-w-md px-3 pb-2 pt-1">
        <div className="solid rounded-2xl shadow-lg shadow-black/10 dark:shadow-black/40 px-2 py-1.5">
          <ul className="flex items-center justify-between">
            {items.map((it) => {
              const active = view === it.id;
              const Icon = it.icon;
              return (
                <li key={it.id} className="flex-1">
                  <button
                    onClick={() => setView(it.id)}
                    className={cn(
                      "relative w-full flex flex-col items-center gap-1 py-2 rounded-xl transition-colors",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-label={it.label}
                    aria-current={active ? "page" : undefined}
                  >
                    {active && (
                      <motion.span
                        layoutId="bottom-nav-active"
                        className="absolute inset-0 rounded-xl bg-primary/10 dark:bg-primary/15"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon className="relative z-10 h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                    <span className="relative z-10 text-[10px] font-medium">{it.label}</span>
                  </button>
                </li>
              );
            })}
            {/* Profile — avatar instead of icon */}
            <li className="flex-1">
              <button
                onClick={() => setView("profile")}
                className={cn(
                  "relative w-full flex flex-col items-center gap-1 py-2 rounded-xl transition-colors",
                  view === "profile" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Profile"
                aria-current={view === "profile" ? "page" : undefined}
              >
                {view === "profile" && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 rounded-xl bg-primary/10 dark:bg-primary/15"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <div className="relative z-10 h-5 w-5 rounded-full overflow-hidden ring-2 ring-offset-1 ring-offset-transparent flex items-center justify-center">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className={cn(
                        "h-full w-full object-cover",
                        view === "profile" && "ring-primary"
                      )}
                    />
                  ) : (
                    <div
                      className={cn(
                        "h-full w-full bg-gradient-to-br from-primary to-blue-800 flex items-center justify-center text-white text-[9px] font-bold",
                        view === "profile" && "ring-primary"
                      )}
                    >
                      {(user?.fullName || user?.name || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="relative z-10 text-[10px] font-medium">Profile</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
