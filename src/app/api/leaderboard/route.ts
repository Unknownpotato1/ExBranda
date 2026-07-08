import { NextResponse } from "next/server";
import { db } from "@/lib/firestore";

// GET /api/leaderboard — top earners (privacy-respecting)
export async function GET() {
  // Users who opted out of showing wallet get hidden from leaderboard amounts.
  const wallets = await db.wallet.findMany({
    where: { user: { role: "user", banned: false } },
    include: { user: true },
    orderBy: { lifetimeEarnings: "desc" },
    take: 50,
  });

  const leaderboard = wallets.map((w, idx) => ({
    rank: idx + 1,
    id: w.user.id,
    name: w.user.fullName || w.user.name || "Anonymous",
    instagram: w.user.instagramHandle,
    lifetimeEarnings: w.user.privacyHideWallet ? null : w.lifetimeEarnings,
    hidden: w.user.privacyHideWallet,
  }));

  return NextResponse.json({ leaderboard });
}
