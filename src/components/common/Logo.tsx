import * as React from "react";
import { cn } from "@/lib/utils";

const LOGO_IMAGE_URL =
  "https://raw.githubusercontent.com/Unknownpotato1/Storage-/main/Picsart_26-07-10_15-46-02-931.jpg";

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  showTagline?: boolean;
}

export function Logo({ className, size = 32, showText = true, showTagline = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src={LOGO_IMAGE_URL}
        alt="ExBranda"
        width={size}
        height={size}
        className="shrink-0 rounded-xl object-cover"
        style={{ width: size, height: size }}
      />
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-semibold text-base tracking-tight">
            Ex<span className="gradient-text">Branda</span>
          </span>
          {showTagline && (
            <span className="text-[10px] text-muted-foreground mt-0.5">Earn by Promoting Brands</span>
          )}
        </div>
      )}
    </div>
  );
}
