"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { BackHeader } from "@/components/submissions/SubmitReelView";
import { toast } from "sonner";
import { Download, Loader, CircleCheck } from "lucide-react";

// The ExBranda logo — hosted on Cloudinary
const LOGO_URL =
  "https://res.cloudinary.com/drlmgjt6p/video/upload/v1783516278/Screenrecorder-2026-07-08-18-07-20-5251_s5cpny.mp4";

export function DownloadLogoView() {
  const [downloading, setDownloading] = React.useState(false);
  const [count, setCount] = React.useState<number | null>(null);

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

        {/* Usage guidelines */}
        <div className="glass rounded-2xl p-4">
          <div className="text-xs font-semibold mb-2.5">Usage Guidelines</div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <CircleCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              Place the logo in a visible corner of your reel
            </li>
            <li className="flex gap-2">
              <CircleCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              Keep it on screen for at least 3 seconds
            </li>
            <li className="flex gap-2">
              <CircleCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              Don't modify, recolor, or stretch the logo
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
    </div>
  );
}
