"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { BackHeader } from "@/components/submissions/SubmitReelView";
import { toast } from "sonner";
import { Download, Loader, CircleCheck, X, Maximize2 } from "lucide-react";

// The ExBranda logo — hosted on Cloudinary
const LOGO_URL =
  "https://res.cloudinary.com/drlmgjt6p/video/upload/v1783516278/Screenrecorder-2026-07-08-18-07-20-5251_s5cpny.mp4";

// Reference image — shows creators how the logo should appear in a reel
const REFERENCE_IMAGE =
  "https://raw.githubusercontent.com/Unknownpotato1/Storage-/main/Picsart_26-07-09_03-13-16-836.jpg";

export function DownloadLogoView() {
  const [downloading, setDownloading] = React.useState(false);
  const [count, setCount] = React.useState<number | null>(null);
  const [fullscreen, setFullscreen] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/downloads")
      .then((r) => r.json())
      .then((j) => setCount(j.count ?? 0))
      .catch(() => setCount(0));
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(LOGO_URL);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ExBranda-Logo.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const r = await fetch("/api/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileType: "logo" }),
      });
      const j = await r.json();
      if (typeof j.count === "number") setCount(j.count);

      toast.success("Downloaded!");
    } catch (e: any) {
      window.open(LOGO_URL, "_blank");
      toast.success("Opened in new tab");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="px-3 pb-4">
      <div className="mx-auto max-w-md space-y-4">
        <BackHeader title="Download Logo" />

        {/* Logo video preview (plays above guidelines) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-4"
        >
          <div className="bg-grid rounded-xl p-2 flex items-center justify-center overflow-hidden">
            <video
              src={LOGO_URL}
              autoPlay
              loop
              muted
              playsInline
              className="w-full max-w-[260px] rounded-lg"
            />
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            ExBranda Logo — tap download below to get the file
          </p>
        </motion.div>

        {/* Reference image — tap to open fullscreen */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-xs font-semibold">How it should look</div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Maximize2 className="h-3 w-3" />
              Tap to enlarge
            </span>
          </div>
          <button
            onClick={() => setFullscreen(true)}
            className="block w-full rounded-xl overflow-hidden ring-1 ring-border/60 hover:ring-primary/40 transition-all active:scale-[0.98]"
            aria-label="Open reference image in full screen"
          >
            <img
              src={REFERENCE_IMAGE}
              alt="Reference — ExBranda logo placed in a reel"
              className="w-full h-auto"
              loading="lazy"
            />
          </button>
        </div>

        {/* Usage guidelines */}
        <div className="glass rounded-2xl p-4">
          <div className="text-xs font-semibold mb-2.5">Usage Guidelines</div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <CircleCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              Keep the logo visible for the full length of your reel
            </li>
            <li className="flex gap-2">
              <CircleCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              Don't modify, recolor, or stretch the logo
            </li>
            <li className="flex gap-2">
              <CircleCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              See the reference image above for placement
            </li>
          </ul>
        </div>

        {/* Download button */}
        <motion.button
          whileTap={{ scale: downloading ? 1 : 0.97 }}
          onClick={handleDownload}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-foreground text-background hover:opacity-90 transition-all glow-primary btn-shine disabled:opacity-60"
        >
          <div className="h-6 w-6 flex items-center justify-center">
            {downloading ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <Download className="h-5 w-5" />
            )}
          </div>
          <span className="font-semibold text-sm">
            {downloading ? "Downloading…" : "Download The Logo"}
          </span>
        </motion.button>

        {count !== null && count > 0 && (
          <div className="text-center flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Download className="h-3 w-3" />
            {count} {count === 1 ? "download" : "downloads"} by you
          </div>
        )}
      </div>

      {/* Fullscreen image viewer */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setFullscreen(false)}
          >
            <button
              onClick={() => setFullscreen(false)}
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={REFERENCE_IMAGE}
              alt="Reference — ExBranda logo placed in a reel (fullscreen)"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
