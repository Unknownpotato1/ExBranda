import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/firestore";

// GET /api/wallet — current user's wallet + transactions
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wallet = await db.wallet.findUnique({ where: { userId: user.id } });
  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

  const transactions = await db.transaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Stats
  const submissions = await db.submission.findMany({ where: { userId: user.id } });
  const approvedReels = submissions.filter((s) => s.status === "approved").length;
  const pendingReels = submissions.filter((s) => s.status === "pending").length;
  const rejectedReels = submissions.filter((s) => s.status === "rejected").length;

  return NextResponse.json({
    wallet: {
      balance: wallet.balance,
      pendingBalance: wallet.pendingBalance,
      lifetimeEarnings: wallet.lifetimeEarnings,
      withdrawnTotal: wallet.withdrawnTotal,
      todayEarnings: wallet.todayEarnings,
    },
    transactions,
    stats: { approvedReels, pendingReels, rejectedReels },
  });
}
