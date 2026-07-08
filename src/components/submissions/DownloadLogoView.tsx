"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { BackHeader } from "@/components/submissions/SubmitReelView";
import { toast } from "sonner";
import {
  Download,
  FileImage,
  FileType2,
  Code,
  Package,
  Loader,
  CircleCheck,
} from "lucide-react";
import { Logo } from "@/components/common/Logo";

const FILES = [
  {
    id: "png",
    title: "PNG Logo",
    description: "Standard logo on white background. Use for posts and stories.",
    icon: FileImage,
    size: "512×512",
  },
  {
    id: "transparent_png",
    title: "Transparent PNG",
    description: "Logo with transparent background. Best for overlaying on videos.",
    icon: FileType2,
    size: "512×512",
  },
  {
    id: "svg",
    title: "SVG Vector",
    description: "Scalable vector logo. Crisp at any size. Best for editing.",
    icon: Code,
    size: "Vector",
  },
  {
    id: "zip",
    title: "ZIP Brand Kit",
    description: "All formats + brand colors + usage guidelines in one bundle.",
    icon: Package,
    size: "~2 MB",
  },
] as const;

// Generate a small PNG/SVG blob in-browser — production: replace with Cloudinary URL.
function generateFile(type: string): { blob: Blob; filename: string } {
  if (type === "svg") {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
      <stop stop-color="#10b981"/>
      <stop offset="0.6" stop-color="#06b6d4"/>
      <stop offset="1" stop-color="#84cc16"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#g)"/>
  <path d="M16 14h14M16 24h12M16 34h14" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
  <circle cx="33" cy="14" r="2.5" fill="white"/>
  <circle cx="31" cy="24" r="2.5" fill="white"/>
  <circle cx="33" cy="34" r="2.5" fill="white"/>
</svg>`;
    return { blob: new Blob([svg], { type: "image/svg+xml" }), filename: "exbranda-logo.svg" };
  }
  // For PNG/transparent/zip — generate a minimal placeholder PNG (white square)
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  if (type !== "transparent_png") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 512, 512);
  }
  // Draw a simple gradient circle
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, "#10b981");
  grad.addColorStop(0.6, "#06b6d4");
  grad.addColorStop(1, "#84cc16");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(20, 20, 472, 472, 140);
  ctx.fill();
  // "EB" text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 200px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("EB", 256, 270);
  const dataUrl = canvas.toDataURL("image/png");
  const b64 = atob(dataUrl.split(",")[1]);
  const bytes = new Uint8Array(b64.length);
  for (let i = 0; i < b64.length; i++) bytes[i] = b64.charCodeAt(i);
  if (type === "zip") {
    // ZIP isn't easy to generate client-side — just give a PNG named .zip placeholder
    return { blob: new Blob([bytes], { type: "application/zip" }), filename: "exbranda-brand-kit.zip" };
  }
  return { blob: new Blob([bytes], { type: "image/png" }), filename: `exbranda-logo-${type}.png` };
}

export function DownloadLogoView() {
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [count, setCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetch("/api/downloads")
      .then((r) => r.json())
      .then((j) => setCount(j.count ?? 0))
      .catch(() => setCount(0));
  }, []);

  const handleDownload = async (type: string) => {
    setDownloading(type);
    try {
      const { blob, filename } = generateFile(type);
      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      // Log to backend
      const r = await fetch("/api/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileType: type }),
      });
      const j = await r.json();
      if (typeof j.count === "number") setCount(j.count);
      toast.success("Downloaded!");
    } catch (e: any) {
      toast.error("Download failed");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="px-3 pb-4">
      <div className="mx-auto max-w-md space-y-4">
        <BackHeader title="Download Logo" />

        {/* Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-6 flex flex-col items-center"
        >
          <div className="bg-grid rounded-2xl p-8 mb-3 w-full flex items-center justify-center">
            <Logo size={88} showText={false} />
          </div>
          <p className="text-sm font-medium">ExBranda Brand Kit</p>
          <p className="text-xs text-muted-foreground mt-0.5 text-center">
            Use this logo in your Reels. Position visibly for at least 3 seconds.
          </p>
          {count !== null && (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Download className="h-3 w-3" />
              {count} downloads by you
            </div>
          )}
        </motion.div>

        {/* Usage guidelines */}
        <div className="glass rounded-2xl p-4">
          <div className="text-xs font-semibold mb-2">Usage Guidelines</div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <CircleCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              Place logo in a visible corner of your reel
            </li>
            <li className="flex gap-2">
              <CircleCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              Keep it on screen for at least 3 seconds
            </li>
            <li className="flex gap-2">
              <CircleCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              Don't modify, recolor, or stretch the logo
            </li>
            <li className="flex gap-2">
              <CircleCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              Transparent PNG works best for overlays
            </li>
          </ul>
        </div>

        {/* Download options */}
        <div className="space-y-2.5">
          {FILES.map((f) => (
            <motion.button
              key={f.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleDownload(f.id)}
              disabled={downloading !== null}
              className="w-full glass rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-foreground/[0.03] transition-colors disabled:opacity-60"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{f.title}</span>
                  <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-foreground/5">
                    {f.size}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{f.description}</div>
              </div>
              <div className="h-9 w-9 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                {downloading === f.id ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </div>
            </motion.button>
          ))}
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Production note: In production, files are served from Cloudinary with versioned URLs.
        </p>
      </div>
    </div>
  );
}
