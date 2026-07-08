"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, X } from "lucide-react";

export function AnnouncementBanner() {
  const [text, setText] = React.useState<string | null>(null);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => {
        if (!active) return;
        const msg = j.settings?.announcement;
        if (msg && msg.trim()) setText(msg);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!text || dismissed) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        className="px-3"
      >
        <div className="mx-auto max-w-md">
          <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
            <Megaphone className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="flex-1 truncate">{text}</span>
            <button
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
