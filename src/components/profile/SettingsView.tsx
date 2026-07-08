"use client";

import * as React from "react";
import { useAppStore } from "@/store/appStore";
import { BackHeader } from "@/components/submissions/SubmitReelView";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, Bell, Globe, FileText, Shield, ChevronRight, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const setView = useAppStore((s) => s.setView);
  const [notifications, setNotifications] = React.useState(true);

  const themes: { id: "light" | "dark" | "system"; label: string; icon: typeof Moon }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="px-3 pb-4">
      <div className="mx-auto max-w-md space-y-4">
        <BackHeader title="Settings" />

        {/* Theme */}
        <div className="glass rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Appearance
          </div>
          <div className="grid grid-cols-3 gap-2">
            {themes.map((t) => {
              const active = theme === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "h-20 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                      : "bg-foreground/[0.03] hover:bg-foreground/[0.06]"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferences */}
        <div className="glass rounded-2xl overflow-hidden divide-y divide-border/40">
          <ToggleRow
            icon={Bell}
            label="Push notifications"
            description="Get notified when your reel is approved"
            checked={notifications}
            onChange={setNotifications}
          />
          <LinkRow icon={Globe} label="Language" value="English (India)" onClick={() => {}} />
        </div>

        {/* Legal */}
        <div className="glass rounded-2xl overflow-hidden divide-y divide-border/40">
          <LinkRow icon={Shield} label="Privacy Policy" onClick={() => setView("legal")} />
          <LinkRow icon={FileText} label="Terms & Conditions" onClick={() => setView("legal")} />
          <LinkRow icon={FileText} label="Earnings Policy" onClick={() => setView("legal")} />
          <LinkRow icon={FileText} label="Refund Policy" onClick={() => setView("legal")} />
          <LinkRow icon={MessageCircle} label="Contact Support" onClick={() => setView("contact")} />
        </div>

        <div className="text-center text-[11px] text-muted-foreground">
          ExBranda v1.0.0 • Made for creators
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: typeof Bell;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-8 w-8 rounded-lg bg-foreground/[0.04] flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "w-10 h-6 rounded-full p-0.5 transition-colors",
          checked ? "bg-primary" : "bg-foreground/15"
        )}
      >
        <div
          className={cn(
            "h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-4"
          )}
        />
      </button>
    </div>
  );
}

function LinkRow({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: typeof Bell;
  label: string;
  value?: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-foreground/[0.03] transition-colors text-left">
      <div className="h-8 w-8 rounded-lg bg-foreground/[0.04] flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {value && <span className="text-xs text-muted-foreground">{value}</span>}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
