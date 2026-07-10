"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserDTO, WalletDTO } from "@/lib/types";

export type ViewName =
  | "dashboard"
  | "submit"
  | "download"
  | "withdraw"
  | "wallet"
  | "history"
  | "profile"
  | "settings"
  | "referrals"
  | "notifications"
  | "faq"
  | "chat"
  | "legal"
  | "admin";

export type ThemeMode = "light" | "dark";

interface AppState {
  // Auth
  user: UserDTO | null;
  wallet: WalletDTO | null;
  isLoadingAuth: boolean;
  setUser: (u: UserDTO | null) => void;
  setWallet: (w: WalletDTO | null) => void;
  setLoadingAuth: (b: boolean) => void;

  // Navigation (single-route SPA with History API integration)
  view: ViewName;
  setView: (v: ViewName) => void;
  setViewInternal: (v: ViewName) => void;
  // pending referral code captured from URL on landing
  pendingReferralCode: string | null;
  setPendingReferralCode: (code: string | null) => void;

  // Theme
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;

  // Last action celebration
  celebrate: boolean;
  triggerCelebrate: () => void;
  clearCelebrate: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      wallet: null,
      isLoadingAuth: true,
      setUser: (u) => set({ user: u }),
      setWallet: (w) => set({ wallet: w }),
      setLoadingAuth: (b) => set({ isLoadingAuth: b }),

      view: "dashboard",

      // Internal setter — just updates state, no history push
      setViewInternal: (v) => set({ view: v }),

      // Public setter — pushes a new history entry so the phone's back
      // button navigates within the app instead of closing it.
      setView: (v) => {
        const current = get().view;
        if (current === v) return;
        // Push state so back button works
        if (typeof window !== "undefined" && v !== "dashboard") {
          window.history.pushState({ view: v, ts: Date.now() }, "", `#${v}`);
        }
        set({ view: v });
      },

      pendingReferralCode: null,
      setPendingReferralCode: (code) => set({ pendingReferralCode: code }),

      theme: "dark",
      setTheme: (t) => set({ theme: t }),

      celebrate: false,
      triggerCelebrate: () => set({ celebrate: true }),
      clearCelebrate: () => set({ celebrate: false }),
    }),
    {
      name: "exbranda-store",
      partialize: (s) => ({ theme: s.theme }),
    }
  )
);
