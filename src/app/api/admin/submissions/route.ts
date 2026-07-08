import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculatePayout } from "@/lib/payout";

// GET /api/admin/submissions?status=pending&q=...
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
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    where.status = status;
  }
  if (q) {
    // Search by reel URL or user name
    where.OR = [
      { reelUrl: { contains: q } },
      { user: { name: { contains: q } } },
      { user: { instagramHandle: { contains: q } } },
      { user: { email: { contains: q } } },
    ];
  }

  const submissions = await db.submission.findMany({
    where,
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    submissions: submissions.map((s) => ({
      ...s,
      userName: s.user?.fullName || s.user?.name,
      userInstagram: s.user?.instagramHandle,
      userEmail: s.user?.email,
    })),
  });
}

// PATCH /api/admin/submissions — approve or reject
// Body: { id, action: "approve" | "reject", rejectionReason?, editedViews?, editedPayout? }
export async function PATCH(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, action, rejectionReason, editedViews, editedPayout } = body;
  if (!id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const submission = await db.submission.findUnique({ where: { id }, include: { user: true } });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (submission.status !== "pending") {
    return NextResponse.json({ error: "Submission already processed" }, { status: 400 });
  }

  if (action === "approve") {
    // Allow admin to edit views and payout
    const finalViews = typeof editedViews === "number" && editedViews >= 0 ? editedViews : submission.newViews;
    const finalPayout =
      typeof editedPayout === "number" && editedPayout >= 0
        ? editedPayout
        : calculatePayout(finalViews, submission.user.referralBonusPct);

    return await db.$transaction(async (tx) => {
      const updated = await tx.submission.update({
        where: { id },
        data: {
          status: "approved",
          approvedViews: finalViews,
          newViews: finalViews,
          payoutAmount: finalPayout,
          approvedAt: new Date(),
          approvedBy: admin.id,
        },
      });

      // Move money from pending to actual balance
      // First, remove the previously-reserved pending amount
      await tx.wallet.update({
        where: { userId: submission.userId },
        data: {
          pendingBalance: { decrement: submission.payoutAmount },
          balance: { increment: finalPayout },
          lifetimeEarnings: { increment: finalPayout },
          todayEarnings: { increment: finalPayout },
        },
      });

      // Transaction log
      await tx.transaction.create({
        data: {
          userId: submission.userId,
          type: "earning",
          amount: finalPayout,
          status: "completed",
          description: `Reel approved — ${finalViews.toLocaleString()} new views`,
          reelUrl: submission.reelUrl,
          views: finalViews,
          submissionId: submission.id,
        },
      });

      // Notification
      await tx.notification.create({
        data: {
          userId: submission.userId,
          title: "Submission Approved 🎉",
          message: `Your reel earned ₹${finalPayout.toFixed(2)} for ${finalViews.toLocaleString()} new views.`,
          type: "submission_approved",
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "submission_approved",
          target: submission.id,
          meta: JSON.stringify({ views: finalViews, payout: finalPayout }),
        },
      });

      // Award badges
      const user = submission.user;
      const totalApprovedViews = await tx.submission.aggregate({
        where: { userId: user.id, status: "approved" },
        _sum: { approvedViews: true },
      });
      const totalViews = totalApprovedViews._sum.approvedViews || 0;
      const approvedCount = await tx.submission.count({ where: { userId: user.id, status: "approved" } });
      const existingBadges: string[] = user.badges ? JSON.parse(user.badges) : [];
      const newBadges = [...existingBadges];
      const addBadge = (b: string) => {
        if (!newBadges.includes(b)) newBadges.push(b);
      };
      if (approvedCount >= 1) addBadge("First Reel");
      if (totalViews >= 100_000) addBadge("100K Views");
      if (totalViews >= 500_000) addBadge("500K Views");
      if (totalViews >= 1_000_000) addBadge("1 Million Views");
      if (totalViews >= 5_000_000) addBadge("Top Creator");
      const activeReferrals = await tx.referral.count({
        where: { referrerId: user.id, status: "active" },
      });
      if (activeReferrals >= 5) addBadge("Referral King");
      if (JSON.stringify(newBadges) !== JSON.stringify(existingBadges)) {
        await tx.user.update({
          where: { id: user.id },
          data: { badges: JSON.stringify(newBadges) },
        });
      }

      return NextResponse.json({ submission: updated });
    });
  } else {
    // Reject
    return await db.$transaction(async (tx) => {
      const updated = await tx.submission.update({
        where: { id },
        data: {
          status: "rejected",
          rejectionReason: rejectionReason || "Does not meet guidelines",
          rejectedViews: submission.newViews,
        },
      });
      // Remove pending reservation
      await tx.wallet.update({
        where: { userId: submission.userId },
        data: { pendingBalance: { decrement: submission.payoutAmount } },
      });
      await tx.notification.create({
        data: {
          userId: submission.userId,
          title: "Submission Rejected",
          message: rejectionReason || "Your submission did not meet our guidelines.",
          type: "submission_rejected",
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "submission_rejected",
          target: submission.id,
          meta: JSON.stringify({ reason: rejectionReason }),
        },
      });
      return NextResponse.json({ submission: updated });
    });
  }
}
