import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/referrals — current user's referral stats and history
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const referralsMade = await db.referral.findMany({
    where: { referrerId: user.id },
    include: { referred: { select: { name: true, instagramHandle: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
  });

  const activeCount = referralsMade.filter((r) => r.status === "active").length;
  const pendingCount = referralsMade.filter((r) => r.status === "pending").length;

  return NextResponse.json({
    referralCode: user.referralCode,
    referralLink: `https://exbranda.com/?ref=${user.referralCode}`,
    referralActive: user.referralActive,
    referralBonusPct: user.referralBonusPct,
    stats: {
      total: referralsMade.length,
      active: activeCount,
      pending: pendingCount,
    },
    referrals: referralsMade.map((r) => ({
      id: r.id,
      status: r.status,
      bonusType: r.bonusType,
      bonusValue: r.bonusValue,
      createdAt: r.createdAt,
      referredName: r.referred?.name,
      referredInstagram: r.referred?.instagramHandle,
      activatedAt: r.activatedAt,
    })),
  });
}
