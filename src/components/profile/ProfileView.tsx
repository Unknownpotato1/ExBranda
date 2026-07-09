"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/store/appStore";
import { BackHeader } from "@/components/submissions/SubmitReelView";
import { toast } from "sonner";
import {
  User as UserIcon,
  Instagram,
  Wallet,
  Globe,
  Mail,
  Gift,
  TrendingUp,
  Copy,
  Check,
  LogOut,
  Shield,
  BadgeCheck,
  ChevronRight,
  Moon,
  Settings as SettingsIcon,
  CircleHelp,
  MessageCircle,
  FileText,
  Camera,
  Loader2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { getCurrentRate, formatINR } from "@/lib/payout";
import { Logo } from "@/components/common/Logo";

export function ProfileView() {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const setView = useAppStore((s) => s.setView);

  const [upiId, setUpiId] = React.useState(user?.upiId || "");
  const [instagramHandle, setInstagramHandle] = React.useState(user?.instagramHandle || "");
  const [country, setCountry] = React.useState(user?.country || "");
  const [privacyHideWallet, setPrivacyHideWallet] = React.useState(user?.privacyHideWallet || false);
  const [saving, setSaving] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const referralLink = `https://exbranda.com/?ref=${user?.referralCode || ""}`;

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image too large (max 2MB)");
      return;
    }

    setUploadingPhoto(true);
    try {
      // Read file as base64 data URL
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload to server (which uploads to Cloudinary)
      const r = await fetch("/api/user/upload-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Upload failed");

      // Refresh session to get updated photoURL
      const me = await fetch("/api/auth/me");
      const meJ = await me.json();
      setUser(meJ.user);
      toast.success("Profile picture updated");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingPhoto(false);
      // Reset input so selecting the same file again triggers change
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upiId, instagramHandle, country, privacyHideWallet }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      // Refresh session
      const me = await fetch("/api/auth/me");
      const meJ = await me.json();
      setUser(meJ.user);
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const copyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.reload();
  };

  if (!user) return null;
  const rate = getCurrentRate(user.referralBonusPct);

  return (
    <div className="px-3 pb-4">
      <div className="mx-auto max-w-md space-y-4">
        <BackHeader title="Profile" />

        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 text-center"
        >
          {/* Profile picture with upload */}
          <div className="relative mx-auto w-fit">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="relative h-20 w-20 rounded-full overflow-hidden group disabled:opacity-60"
              aria-label="Change profile picture"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.fullName || "Profile"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary to-chart-3 flex items-center justify-center text-white font-semibold text-2xl">
                  {(user.fullName || user.name || "U").charAt(0).toUpperCase()}
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingPhoto ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </div>
            </button>
            {/* Small camera badge */}
            {!uploadingPhoto && (
              <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center ring-2 ring-background pointer-events-none">
                <Camera className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="mt-2 text-[11px] text-primary font-medium hover:underline disabled:opacity-60"
          >
            {uploadingPhoto ? "Uploading…" : "Change photo"}
          </button>
          <div className="mt-2 font-semibold">{user.fullName || user.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{user.email}</div>
          {user.instagramHandle && (
            <div className="text-xs text-primary mt-1 flex items-center justify-center gap-1">
              <Instagram className="h-3 w-3" />
              {user.instagramHandle}
            </div>
          )}
          {user.badges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
              {user.badges.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium"
                >
                  <BadgeCheck className="h-3 w-3" />
                  {b}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* Referral card */}
        <div className="rounded-2xl p-4 bg-gradient-to-br from-chart-1/10 via-primary/5 to-chart-3/10 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Gift className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold">Your Referral Code</div>
                <div className="text-[11px] text-muted-foreground">Earn +5% on every view</div>
              </div>
            </div>
            <span className="font-mono text-sm font-semibold tracking-wider bg-background/60 px-3 py-1.5 rounded-lg">
              {user.referralCode}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Input
              readOnly
              value={referralLink}
              className="h-9 rounded-lg text-xs bg-background/60 border-border/40"
            />
            <Button size="sm" variant="outline" className="h-9 px-3 rounded-lg" onClick={copyReferral}>
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <button
            onClick={() => setView("referrals")}
            className="mt-2 text-[11px] text-primary font-medium flex items-center gap-0.5"
          >
            View referral stats <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* Pay rate */}
        <div className="glass rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Current Pay Rate</div>
              <div className="text-sm font-semibold">{formatINR(rate)} / 10K views</div>
            </div>
          </div>
          {user.referralBonusPct > 0 && (
            <span className="text-[10px] font-medium text-primary px-2 py-0.5 rounded-full bg-primary/10">
              +{user.referralBonusPct}% bonus
            </span>
          )}
        </div>

        {/* Edit profile */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Edit Profile
          </div>
          <FieldRow icon={Instagram} label="Instagram" value={instagramHandle} onChange={setInstagramHandle} placeholder="@username" />
          <FieldRow icon={Wallet} label="UPI ID" value={upiId} onChange={setUpiId} placeholder="yourname@okaxis" />
          <FieldRow icon={Globe} label="Country" value={country} onChange={setCountry} placeholder="India" />
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div>
              <div className="text-xs font-medium">Privacy Mode</div>
              <div className="text-[11px] text-muted-foreground">Hide my wallet balance from others</div>
            </div>
            <Switch checked={privacyHideWallet} onCheckedChange={setPrivacyHideWallet} />
          </div>
          <Button onClick={save} disabled={saving} className="w-full h-10 rounded-xl">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>

        {/* Menu */}
        <div className="glass rounded-2xl overflow-hidden divide-y divide-border/40">
          <MenuItem icon={SettingsIcon} label="Settings" onClick={() => setView("settings")} />
          <MenuItem icon={CircleHelp} label="FAQ" onClick={() => setView("faq")} />
          <MenuItem icon={MessageCircle} label="Contact Support" onClick={() => setView("contact")} />
          <MenuItem icon={FileText} label="Legal & Policies" onClick={() => setView("legal")} />
          {user.role === "admin" && (
            <MenuItem icon={Shield} label="Admin Panel" tone="text-amber-500" onClick={() => setView("admin")} />
          )}
        </div>

        <Button variant="outline" className="w-full h-11 rounded-xl text-rose-500" onClick={logout}>
          <LogOut className="h-4 w-4 mr-1.5" />
          Sign out
        </Button>

        <div className="text-center pt-2">
          <Logo size={24} showText={false} className="justify-center opacity-60" />
          <p className="text-[10px] text-muted-foreground mt-1">ExBranda v1.0 • Earn by Promoting Brands</p>
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: typeof UserIcon;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-11 rounded-xl text-sm" />
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  icon: typeof SettingsIcon;
  label: string;
  onClick: () => void;
  tone?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-foreground/[0.03] transition-colors text-left"
    >
      <Icon className={`h-4.5 w-4.5 ${tone || "text-muted-foreground"}`} />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
