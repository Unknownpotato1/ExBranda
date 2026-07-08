import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/firestore";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().min(2, "Full name is too short"),
  instagramHandle: z.string().min(2, "Instagram username is required"),
  country: z.string().min(2, "Country is required"),
  upiId: z.string().min(3, "UPI ID is required"),
  referredBy: z.string().optional().nullable(),
});

// POST /api/user/onboard — completes user profile after first login
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // Self-referral prevention
    if (data.referredBy && data.referredBy.toUpperCase() === user.referralCode.toUpperCase()) {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    // Verify referrer exists (if provided)
    let referrerUser = null;
    if (data.referredBy) {
      referrerUser = await db.user.findUnique({
        where: { referralCode: data.referredBy.toUpperCase() },
      });
      if (!referrerUser) {
        return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
      }
    }

    // Update user
    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        fullName: data.fullName,
        instagramHandle: data.instagramHandle.startsWith("@")
          ? data.instagramHandle
          : `@${data.instagramHandle}`,
        country: data.country,
        upiId: data.upiId,
        referredBy: referrerUser ? referrerUser.referralCode : null,
      },
    });

    // Create referral record (pending until first withdrawal)
    if (referrerUser) {
      const existing = await db.referral.findUnique({ where: { referredId: user.id } });
      if (!existing) {
        await db.referral.create({
          data: {
            referrerId: referrerUser.id,
            referredId: user.id,
            code: referrerUser.referralCode,
            status: "pending",
            bonusType: "rate_5pct",
          },
        });
      }
    }

    // Audit log
    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: "user_onboarded",
        target: user.id,
      },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
