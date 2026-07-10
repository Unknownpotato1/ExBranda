"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";

const DISMISS_KEY = "exbranda-install-dismissed-at";
// Show again after this many hours
const RESHOW_HOURS = 1;

export function InstallPrompt() {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    // Don't show if the app is already installed (running in standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.startsWith("android-app://");

    if (isStandalone) return;

    // Don't show if the browser has already fired appinstalled event
    if ((window as any).__appInstalled) return;

    // Show on every entry, but respect a short dismissal window
    const dismissedAt = Number(sessionStorage.getItem(DISMISS_KEY) || 0);
    const hoursSince = (Date.now() - dismissedAt) / (1000 * 60 * 60);
    if (hoursSince >= RESHOW_HOURS) {
      // Small delay so it slides up after page load
      const t = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  // Listen for the appinstalled event — hide the prompt permanently
  React.useEffect(() => {
    const onInstalled = () => {
      (window as any).__appInstalled = true;
      setShow(false);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  const dismiss = React.useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  }, []);

  const install = () => {
    // Try native PWA install prompt if available
    const evt = (window as any).__beforeInstallPromptEvent;
    if (evt) {
      evt.prompt();
      evt.userChoice?.then(() => dismiss());
    } else {
      // Fallback: show instructions
      alert(
        'To install ExBranda:\n\n• Chrome/Edge: tap the menu (⋮) → "Add to Home screen"\n• Safari: tap the Share button → "Add to Home Screen"'
      );
      dismiss();
    }
  };

  // Capture the beforeinstallprompt event for native PWA install
  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      (window as any).__beforeInstallPromptEvent = e;
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 pb-safe pointer-events-none"
        >
          <div className="mx-auto max-w-md px-3 pb-3 pointer-events-auto">
            <div className="solid rounded-3xl p-5 shadow-2xl shadow-black/20 dark:shadow-black/50 relative overflow-hidden">
              {/* Decorative gradient */}
              <div className="absolute -top-12 -right-8 h-32 w-32 rounded-full bg-primary/20 blur-2xl pointer-events-none" />

              {/* Close button — high z-index, stop propagation, larger hit area */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss();
                }}
                className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full bg-foreground/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors touch-manipulation"
                aria-label="Dismiss"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative flex items-start gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-blue-800 flex items-center justify-center text-white shrink-0">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0 pr-8">
                  <h3 className="font-semibold text-sm">Install ExBranda App</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Add ExBranda to your home screen for a faster, full-screen experience. No app store needed.
                  </p>
                  {/* Action buttons */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={install}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 active:brightness-95 transition-all"
                      type="button"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Install Now
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismiss();
                      }}
                      className="inline-flex items-center h-9 px-4 rounded-xl bg-foreground/5 text-muted-foreground text-xs font-medium hover:bg-foreground/10 hover:text-foreground transition-colors"
                      type="button"
                    >
                      Not now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
