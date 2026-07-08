import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculatePayout } from "@/lib/payout";
import { z } from "zod";

const schema = z.object({
  reelUrl: z.string().url("Please enter a valid Instagram Reel URL"),
  currentViews: z.number().int("Views must be a whole number").min(0, "Views cannot be negative"),
  notes: z.string().max(500).optional(),
  confirmLogo: z.boolean().refine((v) => v === true, "You must confirm the reel contains the ExBranda logo"),
});

// GET /api/submissions — list current user's submissions
// If ?reelUrl= provided, also returns preview info (previousApproved views)
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const previewUrl = searchParams.get("reelUrl");

  const subs = await db.submission.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  // Preview mode: check existing approved views for this reel
  if (previewUrl) {
    const normalized = previewUrl.trim().replace(/\/+$/, "");
    const previousApproved = subs
      .filter((s) => s.reelUrl.replace(/\/+$/, "") === normalized && s.status === "approved")
      .reduce((sum, s) => sum + s.approvedViews, 0);
    const hasPending = subs.some(
      (s) => s.reelUrl.replace(/\/+$/, "") === normalized && s.status === "pending"
    );
    return NextResponse.json({
      submissions: subs,
      previousApproved,
      hasPending,
      newViews: 0,
      payout: 0,
    });
  }

  return NextResponse.json({ submissions: subs });
}

// POST /api/submissions — submit a reel with duplicate-link detection
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.banned) return NextResponse.json({ error: "Account banned" }, { status: 403 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const { reelUrl, currentViews, notes } = parsed.data;

    // Normalize URL — strip trailing slashes for matching
    const normalizedUrl = reelUrl.trim().replace(/\/+$/, "");

    // Find previous submissions for this reel by this user.
    // Query all user's submissions and filter in JS to handle trailing-slash variations
    // (older submissions may have been stored before normalization was added).
    const allUserSubs = await db.submission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    const previousSubs = allUserSubs.filter(
      (s) => s.reelUrl.replace(/\/+$/, "") === normalizedUrl
    );

    // Sum of all previously approved views for this reel
    const previousApprovedViews = previousSubs
      .filter((s) => s.status === "approved")
      .reduce((sum, s) => sum + s.approvedViews, 0);

    // Has a pending submission already?
    const hasPending = previousSubs.some((s) => s.status === "pending");
    if (hasPending) {
      return NextResponse.json(
        { error: "You already have a pending submission for this reel. Please wait for approval before submitting again." },
        { status: 400 }
      );
    }

    // Validate views must be greater than previous approved
    if (currentViews <= previousApprovedViews) {
      return NextResponse.json(
        {
          error: `Current views (${currentViews.toLocaleString()}) must be greater than previously approved views (${previousApprovedViews.toLocaleString()}).`,
        },
        { status: 400 }
      );
    }

    const newViews = currentViews - previousApprovedViews;

    // Calculate payout using current rate (with referral bonus if active)
    const rate = user.referralBonusPct;
    const payoutAmount = calculatePayout(newViews, rate);

    // Create submission in pending state — admin must approve
    const submission = await db.submission.create({
      data: {
        userId: user.id,
        reelUrl: normalizedUrl,
        currentViews,
        previousApprovedViews,
        newViews,
        approvedViews: 0,
        payoutAmount,
        ratePer10k: rate > 0 ? 100 * (1 + rate / 100) : 100,
        status: "pending",
        notes: notes || null,
      },
    });

    // Update pending balance preview (will be confirmed on approval)
    await db.wallet.update({
      where: { userId: user.id },
      data: { pendingBalance: { increment: payoutAmount } },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: "submission_created",
        target: submission.id,
        meta: JSON.stringify({ reelUrl: normalizedUrl, newViews, payout: payoutAmount }),
      },
    });

    return NextResponse.json({ submission });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Submission failed" }, { status: 500 });
  }
}
