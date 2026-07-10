"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";

const DISMISS_KEY = "exbranda-install-dismissed-at";
const PERMANENT_HIDE_KEY = "exbranda-install-permanently-hidden";

export function InstallPrompt() {
  const [show, setShow] = React.useState(false);
  const [canInstall, setCanInstall] = React.useState(false);

  // Detect standalone mode + capture beforeinstallprompt
  React.useEffect(() => {
    // 1. Check if already running as an installed PWA
    const checkStandalone = () => {
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches ||
        window.matchMedia("(display-mode: minimal-ui)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.startsWith("android-app://")
      );
    };

    // 2. Check if user permanently dismissed (installed or clicked "not now" permanently)
    const permanentlyHidden = localStorage.getItem(PERMANENT_HIDE_KEY) === "true";

    if (checkStandalone() || permanentlyHidden) {
      // Running as installed app — never show
      setCanInstall(false);
      return;
    }

    // 3. Capture beforeinstallprompt — if this fires, the app is NOT installed
    //    and the browser supports PWA install. If it does NOT fire, the app
    //    might be installed OR the browser doesn't support PWA.
    const handler = (e: Event) => {
      e.preventDefault();
      (window as any).__beforeInstallPromptEvent = e;
      setCanInstall(true);

      // Now that we know the app can be installed, check dismissal window
      const dismissedAt = Number(sessionStorage.getItem(DISMISS_KEY) || 0);
      const hoursSince = (Date.now() - dismissedAt) / (1000 * 60 * 60);
      if (hoursSince >= 1) {
        const t = setTimeout(() => setShow(true), 1200);
        return () => clearTimeout(t);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);

    // 4. If beforeinstallprompt doesn't fire within 2 seconds, the app is
    //    either installed or the browser doesn't support install. Either way,
    //    don't show the prompt.
    //    BUT: iOS Safari never fires beforeinstallprompt, yet doesn't support
    //    display-mode: standalone reliably. So on iOS we show the prompt with
    //    manual instructions.
    const fallbackTimer = setTimeout(() => {
      if (!(window as any).__beforeInstallPromptEvent) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        if (isIOS && !checkStandalone()) {
          // iOS without standalone = running in Safari, can install via Share menu
          const dismissedAt = Number(sessionStorage.getItem(DISMISS_KEY) || 0);
          const hoursSince = (Date.now() - dismissedAt) / (1000 * 60 * 60);
          if (hoursSince >= 1) {
            setShow(true);
          }
        }
        // Non-iOS without beforeinstallprompt = likely installed or not supported
        // Don't show
      }
    }, 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Listen for appinstalled — permanently hide
  React.useEffect(() => {
    const onInstalled = () => {
      localStorage.setItem(PERMANENT_HIDE_KEY, "true");
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
    const evt = (window as any).__beforeInstallPromptEvent;
    if (evt) {
      evt.prompt();
      evt.userChoice?.then((choice: any) => {
        if (choice.outcome === "accepted") {
          localStorage.setItem(PERMANENT_HIDE_KEY, "true");
        }
        setShow(false);
      });
    } else {
      // iOS fallback
      alert(
        'To install ExBranda:\n\n• Safari: tap the Share button → "Add to Home Screen"\n• Chrome: tap the menu (⋮) → "Add to Home screen"'
      );
      dismiss();
    }
  };

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
              <div className="absolute -top-12 -right-8 h-32 w-32 rounded-full bg-primary/20 blur-2xl pointer-events-none" />

              <button
                onClick={(e) => { e.stopPropagation(); dismiss(); }}
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
                      onClick={(e) => { e.stopPropagation(); dismiss(); }}
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
