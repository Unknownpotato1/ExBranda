import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/admin/withdrawals?status=pending&q=...
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const q = searchParams.get("q") || undefined;

  const where: any = {};
  if (status && ["pending", "approved", "rejected", "paid"].includes(status)) {
    where.status = status;
  }
  if (q) {
    where.OR = [
      { upiId: { contains: q } },
      { user: { name: { contains: q } } },
      { user: { instagramHandle: { contains: q } } },
      { user: { email: { contains: q } } },
    ];
  }

  const withdrawals = await db.withdrawal.findMany({
    where,
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    withdrawals: withdrawals.map((w) => ({
      ...w,
      userName: w.user?.fullName || w.user?.name,
      userInstagram: w.user?.instagramHandle,
      userEmail: w.user?.email,
    })),
  });
}

// PATCH /api/admin/withdrawals — mark paid or reject
// Body: { id, action: "mark_paid" | "reject", rejectedReason? }
export async function PATCH(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, action, rejectedReason } = body;
  if (!id || !["mark_paid", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const withdrawal = await db.withdrawal.findUnique({ where: { id }, include: { user: true } });
  if (!withdrawal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (withdrawal.status !== "pending") {
    return NextResponse.json({ error: "Already processed" }, { status: 400 });
  }

  if (action === "mark_paid") {
    return await db.$transaction(async (tx) => {
      const updated = await tx.withdrawal.update({
        where: { id },
        data: { status: "paid", paidAt: new Date(), paidBy: admin.id },
      });
      // Money already deducted at request time. Now move it to withdrawnTotal.
      await tx.wallet.update({
        where: { userId: withdrawal.userId },
        data: { withdrawnTotal: { increment: withdrawal.amount } },
      });
      // Update the related transaction to completed
      await tx.transaction.updateMany({
        where: {
          userId: withdrawal.userId,
          type: "withdrawal",
          amount: -withdrawal.amount,
          status: "pending",
        },
        data: { status: "completed" },
      });
      await tx.notification.create({
        data: {
          userId: withdrawal.userId,
          title: "Withdrawal Paid 💸",
          message: `₹${withdrawal.amount.toFixed(2)} has been sent to your UPI (${withdrawal.upiId}).`,
          type: "withdrawal_paid",
        },
      });
      // Check referral activation: if this is the user's FIRST successful withdrawal
      // and they were referred by someone, activate the inviter's referral bonus.
      const priorPaid = await tx.withdrawal.count({
        where: { userId: withdrawal.userId, status: "paid", id: { not: withdrawal.id } },
      });
      if (priorPaid === 0) {
        const referral = await tx.referral.findUnique({
          where: { referredId: withdrawal.userId },
        });
        if (referral && referral.status === "pending") {
          await tx.referral.update({
            where: { id: referral.id },
            data: { status: "active", activatedAt: new Date() },
          });
          // Activate bonus on inviter
          const settings = await tx.setting.findMany();
          const settingsMap: Record<string, string> = {};
          for (const s of settings) settingsMap[s.key] = s.value;
          const bonusType = settingsMap["referral_bonus_type"] || "rate_5pct";
          const bonusValue = parseFloat(settingsMap["referral_bonus_value"] || "0");
          if (bonusType === "rate_5pct") {
            await tx.user.update({
              where: { id: referral.referrerId },
              data: { referralActive: true, referralBonusPct: 5 },
            });
          } else if (bonusType === "fixed_inr") {
            // Award fixed bonus to inviter wallet
            await tx.wallet.update({
              where: { userId: referral.referrerId },
              data: {
                balance: { increment: bonusValue },
                lifetimeEarnings: { increment: bonusValue },
                todayEarnings: { increment: bonusValue },
              },
            });
            await tx.transaction.create({
              data: {
                userId: referral.referrerId,
                type: "referral_bonus",
                amount: bonusValue,
                status: "completed",
                description: `Referral bonus — ${referral.referred?.fullName || "a creator"} completed their first withdrawal`,
              },
            });
          }
          await tx.notification.create({
            data: {
              userId: referral.referrerId,
              title: "Referral Activated 🎉",
              message:
                bonusType === "rate_5pct"
                  ? "Your referral bonus is now active! You earn +5% on every view."
                  : `Referral bonus of ₹${bonusValue.toFixed(2)} added to your wallet!`,
              type: "referral_activated",
            },
          });
        }
      }
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "withdrawal_marked_paid",
          target: withdrawal.id,
        },
      });
      return NextResponse.json({ withdrawal: updated });
    });
  } else {
    // Reject — refund the held amount
    return await db.$transaction(async (tx) => {
      const updated = await tx.withdrawal.update({
        where: { id },
        data: { status: "rejected", rejectedReason: rejectedReason || "Rejected by admin" },
      });
      await tx.wallet.update({
        where: { userId: withdrawal.userId },
        data: { balance: { increment: withdrawal.amount } },
      });
      await tx.transaction.updateMany({
        where: {
          userId: withdrawal.userId,
          type: "withdrawal",
          amount: -withdrawal.amount,
          status: "pending",
        },
        data: { status: "rejected" },
      });
      await tx.notification.create({
        data: {
          userId: withdrawal.userId,
          title: "Withdrawal Rejected",
          message: rejectedReason || "Your withdrawal request was rejected. Amount refunded to wallet.",
          type: "withdrawal_approved",
        },
      });
      await tx.auditLog.create({
        data: { actorId: admin.id, action: "withdrawal_rejected", target: withdrawal.id },
      });
      return NextResponse.json({ withdrawal: updated });
    });
  }
}
