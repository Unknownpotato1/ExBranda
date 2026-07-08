import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/firestore";
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

  let submissions = await db.submission.findMany({
    where,
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Search in JS (Firestore doesn't support OR contains)
  if (q) {
    const ql = q.toLowerCase();
    submissions = submissions.filter(
      (s: any) =>
        s.reelUrl?.toLowerCase().includes(ql) ||
        s.user?.name?.toLowerCase().includes(ql) ||
        s.user?.fullName?.toLowerCase().includes(ql) ||
        s.user?.instagramHandle?.toLowerCase().includes(ql) ||
        s.user?.email?.toLowerCase().includes(ql)
    );
  }

  return NextResponse.json({
    submissions: submissions.map((s: any) => ({
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

    // === APPROVE FLOW ===
    // Note: We use sequential operations with atomic increments on the wallet.
    // Firestore doesn't support multi-document transactions across collections
    // in the same way Prisma does, but each operation is atomic individually.
    const updated = await db.submission.update({
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

    // Move money from pending to actual balance atomically
    await db.incrementWallet(submission.userId, {
      pendingBalance: -submission.payoutAmount,
      balance: finalPayout,
      lifetimeEarnings: finalPayout,
      todayEarnings: finalPayout,
    });

    // Transaction log
    await db.transaction.create({
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
    await db.notification.create({
      data: {
        userId: submission.userId,
        title: "Submission Approved 🎉",
        message: `Your reel earned ₹${finalPayout.toFixed(2)} for ${finalViews.toLocaleString()} new views.`,
        type: "submission_approved",
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        actorId: admin.id,
        action: "submission_approved",
        target: submission.id,
        meta: JSON.stringify({ views: finalViews, payout: finalPayout }),
      },
    });

    // Award badges
    const user = submission.user;
    const totalApprovedViews = await db.submission.aggregate({
      where: { userId: user.id, status: "approved" },
      _sum: { approvedViews: true },
    });
    const totalViews = totalApprovedViews._sum.approvedViews || 0;
    const approvedCount = await db.submission.count({ where: { userId: user.id, status: "approved" } });
    const existingBadges: string[] = user.badges ? (typeof user.badges === "string" ? JSON.parse(user.badges) : user.badges) : [];
    const newBadges = [...existingBadges];
    const addBadge = (b: string) => {
      if (!newBadges.includes(b)) newBadges.push(b);
    };
    if (approvedCount >= 1) addBadge("First Reel");
    if (totalViews >= 100_000) addBadge("100K Views");
    if (totalViews >= 500_000) addBadge("500K Views");
    if (totalViews >= 1_000_000) addBadge("1 Million Views");
    if (totalViews >= 5_000_000) addBadge("Top Creator");
    const activeReferrals = await db.referral.count({
      where: { referrerId: user.id, status: "active" },
    });
    if (activeReferrals >= 5) addBadge("Referral King");
    if (JSON.stringify(newBadges) !== JSON.stringify(existingBadges)) {
      await db.user.update({
        where: { id: user.id },
        data: { badges: newBadges },
      });
    }

    return NextResponse.json({ submission: updated });
  } else {
    // === REJECT FLOW ===
    const updated = await db.submission.update({
      where: { id },
      data: {
        status: "rejected",
        rejectionReason: rejectionReason || "Does not meet guidelines",
        rejectedViews: submission.newViews,
      },
    });
    // Remove pending reservation atomically
    await db.incrementWallet(submission.userId, {
      pendingBalance: -submission.payoutAmount,
    });
    await db.notification.create({
      data: {
        userId: submission.userId,
        title: "Submission Rejected",
        message: rejectionReason || "Your submission did not meet our guidelines.",
        type: "submission_rejected",
      },
    });
    await db.auditLog.create({
      data: {
        actorId: admin.id,
        action: "submission_rejected",
        target: submission.id,
        meta: JSON.stringify({ reason: rejectionReason }),
      },
    });
    return NextResponse.json({ submission: updated });
  }
}
