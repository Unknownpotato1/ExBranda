"use client";

import { useAppStore } from "@/store/appStore";
import { Logo } from "@/components/common/Logo";
import { MessageCircle, Shield } from "lucide-react";

export function Footer() {
  const setView = useAppStore((s) => s.setView);

  return (
    <footer className="mt-auto px-3 pt-2 pb-1">
      <div className="mx-auto max-w-md">
        <div className="glass rounded-2xl p-4 space-y-3">
          {/* Brand row */}
          <div className="flex items-center justify-between">
            <Logo size={26} />
            <span className="text-[10px] text-muted-foreground">v1.0.0</span>
          </div>

          {/* Tagline */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            Turn your Instagram Reels into real income. Earn by promoting brands you love.
          </p>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <FooterLink label="FAQ" onClick={() => setView("faq")} />
            <FooterLink label="About Us" onClick={() => setView("legal")} />
            <FooterLink label="Privacy Policy" onClick={() => setView("legal")} />
            <FooterLink label="Terms of Service" onClick={() => setView("legal")} />
            <FooterLink label="Earnings Policy" onClick={() => setView("legal")} />
            <FooterLink label="Refund Policy" onClick={() => setView("legal")} />
          </div>

          {/* Divider */}
          <div className="h-px bg-border/40" />

          {/* Chat with Us button + secured badge */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setView("chat")}
              className="h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              aria-label="Chat with Us"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Shield className="h-3 w-3" />
              Secured by Firebase
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center text-[10px] text-muted-foreground">
            © 2026 ExBranda. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors"
    >
      {label}
    </button>
  );
}
