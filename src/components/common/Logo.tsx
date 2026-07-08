import * as React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function Logo({ className, size = 32, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="exb-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3b82f6" />
            <stop offset="0.5" stopColor="#2563eb" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#exb-grad)" />
        <rect x="2" y="2" width="44" height="44" rx="13" fill="white" fillOpacity="0.06" />
        <path
          d="M16 14h14M16 24h12M16 34h14"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
        />
        <circle cx="33" cy="14" r="2.5" fill="white" />
        <circle cx="31" cy="24" r="2.5" fill="white" />
        <circle cx="33" cy="34" r="2.5" fill="white" />
      </svg>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-semibold text-base tracking-tight">
            Ex<span className="gradient-text">Branda</span>
          </span>
        </div>
      )}
    </div>
  );
}
