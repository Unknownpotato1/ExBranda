"use client";

import { useAppStore } from "@/store/appStore";
import { Logo } from "@/components/common/Logo";
import { Instagram, Mail, Shield, Heart } from "lucide-react";

export function Footer() {
  const setView = useAppStore((s) => s.setView);

  return (
    <footer className="mt-auto px-3 pt-6 pb-2">
      <div className="mx-auto max-w-md">
        <div className="glass rounded-2xl p-5 space-y-4">
          {/* Brand row */}
          <div className="flex items-center justify-between">
            <Logo size={28} />
            <span className="text-[10px] text-muted-foreground">v1.0.0</span>
          </div>

          {/* Tagline */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            Turn your Instagram Reels into real income. Earn by promoting brands you love.
          </p>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <FooterLink label="FAQ" onClick={() => setView("faq")} />
            <FooterLink label="Chat with Us" onClick={() => setView("chat")} />
            <FooterLink label="Privacy Policy" onClick={() => setView("legal")} />
            <FooterLink label="Terms of Service" onClick={() => setView("legal")} />
            <FooterLink label="Earnings Policy" onClick={() => setView("legal")} />
            <FooterLink label="Refund Policy" onClick={() => setView("legal")} />
          </div>

          {/* Divider */}
          <div className="h-px bg-border/40" />

          {/* Social + contact */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com/exbranda"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="mailto:support@exbranda.com"
                className="h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                aria-label="Email"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Shield className="h-3 w-3" />
              Secured by Firebase
            </div>
          </div>

          {/* Copyright */}
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground pt-1">
            Made with <Heart className="h-2.5 w-2.5 text-primary fill-primary" /> for creators
            · © 2026 ExBranda
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
