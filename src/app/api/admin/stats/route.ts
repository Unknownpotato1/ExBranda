import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/admin/stats
export async function GET() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalUsers,
    todayNewUsers,
    totalSubmissions,
    pendingSubmissions,
    approvedSubmissions,
    rejectedSubmissions,
    todayWithdrawals,
    pendingWithdrawals,
    totalPaidAgg,
    totalDownloads,
    topEarnersWallets,
    referrals,
  ] = await Promise.all([
    db.user.count({ where: { role: "user" } }),
    db.user.count({ where: { role: "user", createdAt: { gte: startOfToday } } }),
    db.submission.count(),
    db.submission.count({ where: { status: "pending" } }),
    db.submission.count({ where: { status: "approved" } }),
    db.submission.count({ where: { status: "rejected" } }),
    db.withdrawal.count({ where: { createdAt: { gte: startOfToday } } }),
    db.withdrawal.count({ where: { status: "pending" } }),
    db.withdrawal.aggregate({ _sum: { amount: true }, where: { status: "paid" } }),
    db.download.count(),
    db.wallet.findMany({
      where: { user: { role: "user" } },
      include: { user: true },
      orderBy: { lifetimeEarnings: "desc" },
      take: 10,
    }),
    db.referral.findMany({
      where: { status: "active" },
      include: { referrer: true },
    }),
  ]);

  // Top referrers — count active referrals per referrer
  const referrerCounts = new Map<string, number>();
  for (const r of referrals) {
    referrerCounts.set(r.referrerId, (referrerCounts.get(r.referrerId) || 0) + 1);
  }
  const topReferrers = Array.from(referrerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => {
      const ref = referrals.find((r) => r.referrerId === id)?.referrer;
      return {
        id,
        name: ref?.fullName || ref?.name || "Anonymous",
        instagram: ref?.instagramHandle,
        referrals: count,
      };
    });

  // Build last-14-day trend
  const days: { date: string; count: number }[] = [];
  const payoutDays: { date: string; amount: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);

    const [subs, paid] = await Promise.all([
      db.submission.count({ where: { createdAt: { gte: day, lt: next } } }),
      db.withdrawal.aggregate({
        _sum: { amount: true },
        where: { status: "paid", paidAt: { gte: day, lt: next } },
      }),
    ]);
    days.push({ date: day.toISOString().slice(5, 10), count: subs });
    payoutDays.push({ date: day.toISOString().slice(5, 10), amount: paid._sum.amount || 0 });
  }

  return NextResponse.json({
    totalUsers,
    todayNewUsers,
    totalSubmissions,
    pendingSubmissions,
    approvedSubmissions,
    rejectedSubmissions,
    todayWithdrawals,
    pendingWithdrawals,
    totalPaid: totalPaidAgg._sum.amount || 0,
    totalDownloads,
    topEarners: topEarnersWallets.map((w) => ({
      id: w.user.id,
      name: w.user.fullName || w.user.name || "Anonymous",
      instagram: w.user.instagramHandle,
      earnings: w.lifetimeEarnings,
    })),
    topReferrers,
    submissionsTrend: days,
    payoutsTrend: payoutDays,
  });
}
