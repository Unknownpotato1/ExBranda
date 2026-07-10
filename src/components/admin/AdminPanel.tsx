"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  FileCheck,
  Clock,
  IndianRupee,
  Download,
  TrendingUp,
  Crown,
  Gift,
  CircleCheck,
  CircleX,
  Search,
  Loader,
  ArrowLeft,
  Shield,
  Ban,
  Trash2,
  ExternalLink,
  Instagram,
  Send,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { formatINR, formatNumber } from "@/lib/payout";
import { toast } from "sonner";
import { Logo } from "@/components/common/Logo";

type AdminTab = "stats" | "submissions" | "withdrawals" | "users" | "chat";

export function AdminPanel() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const [tab, setTab] = React.useState<AdminTab>("stats");

  if (!user || user.role !== "admin") {
    return (
      <div className="px-3 py-12 text-center">
        <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <div className="font-semibold">Admin access required</div>
        <Button onClick={() => setView("dashboard")} className="mt-4 rounded-xl">Back to dashboard</Button>
      </div>
    );
  }

  return (
    <div className="px-3 pb-4 min-h-screen bg-aurora">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("dashboard")}
              className="h-9 w-9 rounded-xl glass flex items-center justify-center"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-amber-500" />
                <h1 className="text-lg font-semibold">Admin Panel</h1>
              </div>
              <p className="text-[11px] text-muted-foreground">Manage ExBranda</p>
            </div>
          </div>
          <Logo size={28} showText={false} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 glass rounded-xl p-1 sticky top-2 z-20">
          {(["stats", "submissions", "withdrawals", "users", "chat"] as AdminTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 h-9 rounded-lg text-xs font-medium capitalize transition-colors ${
                tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "stats" && <StatsTab />}
        {tab === "submissions" && <SubmissionsTab />}
        {tab === "withdrawals" && <WithdrawalsTab />}
        {tab === "users" && <UsersTab />}
        {tab === "chat" && <AdminChatTab />}
      </div>
    </div>
  );
}

/* ============ STATS ============ */
function StatsTab() {
  const [stats, setStats] = React.useState<any>(null);

  React.useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((j) => setStats(j))
      .catch(() => {});
  }, []);

  if (!stats) return <div className="py-12 text-center"><Loader className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;

  const cards = [
    { label: "Total Users", value: formatNumber(stats.totalUsers), icon: Users, tone: "text-chart-1" },
    { label: "New Today", value: formatNumber(stats.todayNewUsers), icon: TrendingUp, tone: "text-chart-3" },
    { label: "Submissions", value: formatNumber(stats.totalSubmissions), icon: FileCheck, tone: "text-chart-2" },
    { label: "Pending", value: formatNumber(stats.pendingSubmissions), icon: Clock, tone: "text-amber-500" },
    { label: "Approved", value: formatNumber(stats.approvedSubmissions), icon: CircleCheck, tone: "text-emerald-500" },
    { label: "Rejected", value: formatNumber(stats.rejectedSubmissions), icon: CircleX, tone: "text-rose-500" },
    { label: "Today Withdrawals", value: formatNumber(stats.todayWithdrawals), icon: IndianRupee, tone: "text-chart-4" },
    { label: "Pending Withdrawals", value: formatNumber(stats.pendingWithdrawals), icon: Clock, tone: "text-amber-500" },
    { label: "Total Paid", value: formatINR(stats.totalPaid), icon: IndianRupee, tone: "text-emerald-500" },
    { label: "Total Downloads", value: formatNumber(stats.totalDownloads), icon: Download, tone: "text-chart-5" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {cards.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="glass rounded-2xl p-3"
          >
            <c.icon className={`h-4 w-4 mb-1.5 ${c.tone}`} />
            <div className="text-lg font-semibold tabular-nums truncate">{c.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{c.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="glass rounded-2xl p-4">
        <div className="text-xs font-semibold mb-3">Submissions — last 14 days</div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.submissionsTrend}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" width={28} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="count" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="text-xs font-semibold mb-3">Payouts — last 14 days (₹)</div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.payoutsTrend}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" width={36} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="amount" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top earners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4">
          <div className="text-xs font-semibold mb-3 flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5 text-amber-500" />
            Top Earners
          </div>
          <div className="space-y-2">
            {stats.topEarners.slice(0, 5).map((u: any, i: number) => (
              <div key={u.id} className="flex items-center gap-2 text-xs">
                <span className="w-5 text-muted-foreground">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{u.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{u.instagram}</div>
                </div>
                <span className="font-semibold tabular-nums">{formatINR(u.earnings)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs font-semibold mb-3 flex items-center gap-1.5">
            <Gift className="h-3.5 w-3.5 text-chart-3" />
            Top Referrers
          </div>
          <div className="space-y-2">
            {stats.topReferrers.slice(0, 5).map((u: any, i: number) => (
              <div key={u.id} className="flex items-center gap-2 text-xs">
                <span className="w-5 text-muted-foreground">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{u.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{u.instagram}</div>
                </div>
                <span className="font-semibold tabular-nums">{u.referrals}</span>
              </div>
            ))}
            {stats.topReferrers.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4">No active referrals yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ SUBMISSIONS ============ */
function SubmissionsTab() {
  const [status, setStatus] = React.useState<"pending" | "approved" | "rejected">("pending");
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<any[] | null>(null);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [rejecting, setRejecting] = React.useState<any | null>(null);

  const load = React.useCallback(async () => {
    setItems(null);
    const r = await fetch(`/api/admin/submissions?status=${status}&q=${encodeURIComponent(q)}`);
    const j = await r.json();
    setItems(j.submissions || []);
  }, [status, q]);

  React.useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const act = async (id: string, action: "approve" | "reject", body?: any) => {
    const r = await fetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, ...body }),
    });
    const j = await r.json();
    if (!r.ok) {
      toast.error(j.error || "Failed");
      return;
    }
    toast.success(action === "approve" ? "Submission approved!" : "Submission rejected");
    setEditing(null);
    setRejecting(null);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 glass rounded-xl p-1">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`flex-1 h-8 rounded-lg text-xs font-medium capitalize transition-colors ${
              status === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by URL, username, email…"
          className="h-10 rounded-xl pl-9 text-sm"
        />
      </div>

      {items === null ? (
        <div className="py-12 text-center"><Loader className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          No {status} submissions
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <div key={s.id} className="glass rounded-xl p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <a
                    href={s.reelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-primary flex items-center gap-1 hover:underline truncate"
                  >
                    <Instagram className="h-3 w-3 shrink-0" />
                    <span className="truncate">{s.reelUrl.replace(/^https?:\/\/(www\.)?/, "")}</span>
                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                  </a>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {s.userName} {s.userInstagram && `• ${s.userInstagram}`}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-[11px] mb-2">
                <Cell label="Current" value={formatNumber(s.currentViews)} />
                <Cell label="Prev Approved" value={formatNumber(s.previousApprovedViews)} />
                <Cell label="New" value={formatNumber(s.newViews)} tone="text-primary" />
                <Cell label="Payout" value={formatINR(s.payoutAmount)} tone="text-emerald-500" />
              </div>
              {s.notes && <div className="text-[11px] text-muted-foreground italic mb-2">"{s.notes}"</div>}
              {s.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" className="h-8 rounded-lg flex-1" onClick={() => setEditing(s)}>
                    <CircleCheck className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 rounded-lg flex-1 text-rose-500" onClick={() => setRejecting(s)}>
                    <CircleX className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
              {s.status === "approved" && (
                <div className="text-[11px] text-emerald-500">Approved • {formatINR(s.payoutAmount)} paid</div>
              )}
              {s.status === "rejected" && (
                <div className="text-[11px] text-rose-500">Rejected: {s.rejectionReason}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approve dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve submission</DialogTitle>
          </DialogHeader>
          <ApproveForm
            sub={editing}
            onCancel={() => setEditing(null)}
            onApprove={(editedViews, editedPayout) => act(editing.id, "approve", { editedViews, editedPayout })}
          />
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject submission</DialogTitle>
          </DialogHeader>
          <RejectForm
            onCancel={() => setRejecting(null)}
            onReject={(reason) => act(rejecting.id, "reject", { rejectionReason: reason })}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApproveForm({ sub, onCancel, onApprove }: { sub: any; onCancel: () => void; onApprove: (views: number, payout: number) => void }) {
  const [views, setViews] = React.useState(sub?.newViews?.toString() || "0");
  const [payout, setPayout] = React.useState(sub?.payoutAmount?.toString() || "0");
  if (!sub) return null;
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Reviewing reel from <span className="font-medium text-foreground">{sub.userName}</span>. You can adjust views and payout before approving.
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Approved new views</Label>
        <Input value={views} onChange={(e) => setViews(e.target.value.replace(/[^0-9]/g, ""))} className="h-10 rounded-lg" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Payout amount (₹)</Label>
        <Input value={payout} onChange={(e) => setPayout(e.target.value.replace(/[^0-9.]/g, ""))} className="h-10 rounded-lg" />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} className="rounded-lg">Cancel</Button>
        <Button onClick={() => onApprove(parseInt(views || "0"), parseFloat(payout || "0"))} className="rounded-lg">
          <CircleCheck className="h-4 w-4 mr-1.5" />
          Approve & pay
        </Button>
      </DialogFooter>
    </div>
  );
}

function RejectForm({ onCancel, onReject }: { onCancel: () => void; onReject: (reason: string) => void }) {
  const [reason, setReason] = React.useState("");
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">Tell the creator why this was rejected.</div>
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Logo not visible in the reel"
        className="rounded-lg min-h-[80px]"
      />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} className="rounded-lg">Cancel</Button>
        <Button variant="destructive" onClick={() => onReject(reason || "Does not meet guidelines")} className="rounded-lg">
          <CircleX className="h-4 w-4 mr-1.5" />
          Reject
        </Button>
      </DialogFooter>
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-foreground/[0.03] rounded-lg px-2 py-1.5">
      <div className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-xs font-semibold tabular-nums ${tone || ""}`}>{value}</div>
    </div>
  );
}

/* ============ WITHDRAWALS ============ */
function WithdrawalsTab() {
  const [status, setStatus] = React.useState<"pending" | "paid" | "rejected">("pending");
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<any[] | null>(null);

  const load = React.useCallback(async () => {
    setItems(null);
    const r = await fetch(`/api/admin/withdrawals?status=${status}&q=${encodeURIComponent(q)}`);
    const j = await r.json();
    setItems(j.withdrawals || []);
  }, [status, q]);

  React.useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const act = async (id: string, action: "mark_paid" | "reject", reason?: string) => {
    const r = await fetch("/api/admin/withdrawals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, rejectedReason: reason }),
    });
    const j = await r.json();
    if (!r.ok) {
      toast.error(j.error || "Failed");
      return;
    }
    toast.success(action === "mark_paid" ? "Marked as paid" : "Withdrawal rejected");
    load();
  };

  const exportCSV = () => {
    if (!items || items.length === 0) return;
    const rows = [
      ["User", "Email", "UPI", "Amount", "Status", "Date"].join(","),
      ...items.map((w) =>
        [w.userName, w.userEmail, w.upiId, w.amount, w.status, new Date(w.createdAt).toISOString()].join(",")
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `withdrawals-${status}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 glass rounded-xl p-1">
        {(["pending", "paid", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`flex-1 h-8 rounded-lg text-xs font-medium capitalize transition-colors ${
              status === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="h-10 rounded-xl pl-9 text-sm"
          />
        </div>
        <Button variant="outline" className="h-10 rounded-xl" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1.5" />
          CSV
        </Button>
      </div>

      {items === null ? (
        <div className="py-12 text-center"><Loader className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          No {status} withdrawals
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((w) => (
            <div key={w.id} className="glass rounded-xl p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{formatINR(w.amount)}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{w.userName} • {w.userInstagram || w.userEmail}</div>
                  <div className="text-[11px] text-muted-foreground">UPI: {w.upiId}</div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(w.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
              {w.status === "pending" && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" className="h-8 rounded-lg flex-1" onClick={() => act(w.id, "mark_paid")}>
                    <CircleCheck className="h-3.5 w-3.5 mr-1" />
                    Mark Paid
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 rounded-lg text-rose-500" onClick={() => act(w.id, "reject", "Invalid UPI")}>
                    <CircleX className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
              {w.status === "paid" && <div className="text-[11px] text-emerald-500 mt-1">Paid {w.paidAt && new Date(w.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>}
              {w.status === "rejected" && <div className="text-[11px] text-rose-500 mt-1">Rejected: {w.rejectedReason}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ USERS ============ */
function UsersTab() {
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<any[] | null>(null);

  const load = React.useCallback(async () => {
    setItems(null);
    const r = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
    const j = await r.json();
    setItems(j.users || []);
  }, [q]);

  React.useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const act = async (id: string, action: "ban" | "unban" | "delete") => {
    if (action === "delete" && !confirm("Permanently delete this user? This cannot be undone.")) return;
    const r = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const j = await r.json();
    if (!r.ok) {
      toast.error(j.error || "Failed");
      return;
    }
    toast.success(`User ${action}ned`.replace("banneded", "banned"));
    load();
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email, IG, referral code…"
          className="h-10 rounded-xl pl-9 text-sm"
        />
      </div>

      {items === null ? (
        <div className="py-12 text-center"><Loader className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">No users found</div>
      ) : (
        <div className="space-y-2">
          {items.map((u) => (
            <div key={u.id} className={`glass rounded-xl p-3 ${u.banned ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-chart-3/20 flex items-center justify-center text-sm font-semibold shrink-0">
                    {(u.fullName || u.name || "U").charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {u.fullName || u.name}
                      {u.banned && <span className="ml-1.5 text-[10px] text-rose-500">BANNED</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{u.email || u.userEmail}</div>
                    {u.instagramHandle && (
                      <div className="text-[11px] text-primary truncate flex items-center gap-1">
                        <Instagram className="h-2.5 w-2.5 shrink-0" />
                        {u.instagramHandle}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold tabular-nums">{formatINR(u.lifetimeEarnings)}</div>
                  <div className="text-[10px] text-muted-foreground">lifetime</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                <div className="text-[10px] text-muted-foreground">
                  Referral: <span className="font-mono">{u.referralCode}</span>
                  {u.referralBonusPct > 0 && <span className="ml-2 text-primary">+{u.referralBonusPct}% active</span>}
                </div>
                <div className="flex gap-1">
                  {u.banned ? (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs rounded-lg" onClick={() => act(u.id, "unban")}>
                      Unban
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs rounded-lg text-amber-500" onClick={() => act(u.id, "ban")}>
                      <Ban className="h-3 w-3 mr-1" />
                      Ban
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs rounded-lg text-rose-500" onClick={() => act(u.id, "delete")}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ ADMIN CHAT ============ */
function AdminChatTab() {
  const [conversations, setConversations] = React.useState<any[] | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<any[] | null>(null);
  const [replyText, setReplyText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const loadConvos = React.useCallback(async () => {
    try {
      const r = await fetch("/api/admin/chat");
      const j = await r.json();
      setConversations(j.conversations || []);
    } catch {
      setConversations([]);
    }
  }, []);

  const loadMessages = React.useCallback(async (userId: string) => {
    try {
      const r = await fetch(`/api/admin/chat?userId=${userId}`);
      const j = await r.json();
      setMessages(j.messages || []);
    } catch {
      setMessages([]);
    }
  }, []);

  React.useEffect(() => {
    loadConvos();
    const id = setInterval(loadConvos, 10000);
    return () => clearInterval(id);
  }, [loadConvos]);

  React.useEffect(() => {
    if (selectedUserId) {
      loadMessages(selectedUserId);
      const id = setInterval(() => loadMessages(selectedUserId), 5000);
      return () => clearInterval(id);
    }
  }, [selectedUserId, loadMessages]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendReply = async () => {
    if (!replyText.trim() || !selectedUserId || sending) return;
    setSending(true);
    const msg = replyText.trim();
    setReplyText("");
    const optimistic = { id: `temp-${Date.now()}`, sender: "admin", text: msg, imageUrl: null, createdAt: new Date().toISOString(), read: false };
    setMessages((prev) => [...(prev || []), optimistic]);
    try {
      const r = await fetch("/api/admin/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selectedUserId, text: msg }) });
      if (!r.ok) throw new Error("Failed");
      await loadMessages(selectedUserId);
      await loadConvos();
    } catch {
      toast.error("Failed to send");
      setMessages((prev) => (prev || []).filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  if (selectedUserId && messages !== null) {
    const convo = conversations?.find((c) => c.userId === selectedUserId);
    return (
      <div className="flex flex-col" style={{ minHeight: "500px" }}>
        <div className="glass rounded-xl p-3 flex items-center gap-3 mb-3">
          <button onClick={() => { setSelectedUserId(null); setMessages(null); }} className="h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center text-muted-foreground hover:text-foreground" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/20 to-chart-3/20 flex items-center justify-center text-sm font-semibold">{(convo?.userName || "U").charAt(0)}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{convo?.userName || "User"}</div>
            <div className="text-[11px] text-muted-foreground truncate">{convo?.userEmail}</div>
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto slim-scroll space-y-2 mb-3 min-h-[300px] max-h-[400px]">
          {messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">No messages yet</div>
          ) : (
            messages.map((m) => {
              const isAdmin = m.sender === "admin";
              const time = new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={m.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
                    <div className={`rounded-2xl px-3 py-2 ${isAdmin ? "bg-primary text-primary-foreground rounded-br-md" : "glass rounded-bl-md"}`}>
                      {m.imageUrl && <img src={m.imageUrl} alt="" className="rounded-lg max-w-full max-h-48 mb-1" />}
                      {m.text && <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 px-1">{time}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="glass rounded-xl p-2.5 flex items-end gap-2">
          <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }} placeholder="Type your reply…" rows={1} className="flex-1 bg-transparent text-sm resize-none outline-none py-2.5 px-1 max-h-24" disabled={sending} />
          <button onClick={sendReply} disabled={!replyText.trim() || sending} className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40" aria-label="Send">
            {sending ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conversations === null ? (
        <div className="py-12 text-center"><Loader className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : conversations.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">No conversations yet. When users send a chat message, it will appear here.</div>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <button key={c.userId} onClick={() => setSelectedUserId(c.userId)} className="w-full glass rounded-xl p-3 flex items-center gap-3 hover:bg-foreground/[0.03] transition-colors text-left">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-chart-3/20 flex items-center justify-center text-sm font-semibold shrink-0">{c.userName.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{c.userName}</div>
                <div className="text-[11px] text-muted-foreground truncate">{c.lastSender === "admin" ? "You: " : ""}{c.lastMessage || "📷 Image"}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-muted-foreground">{new Date(c.lastAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                {c.unreadCount > 0 && <span className="inline-flex items-center justify-center h-4 min-w-4 px-1.5 mt-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">{c.unreadCount}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
