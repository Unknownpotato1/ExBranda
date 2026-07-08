import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/firestore";
import { MIN_WITHDRAWAL } from "@/lib/types";
import { z } from "zod";

const schema = z.object({
  amount: z.number().int("Amount cannot contain decimals").positive("Amount must be positive"),
  upiId: z.string().min(3, "UPI ID is required"),
});

// GET /api/withdrawals — current user's withdrawal history
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const withdrawals = await db.withdrawal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ withdrawals });
}

// POST /api/withdrawals — request a withdrawal (admin must mark paid)
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
    const { amount, upiId } = parsed.data;

    const wallet = await db.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

    // Validation
    if (amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ₹${MIN_WITHDRAWAL}` },
        { status: 400 }
      );
    }
    if (amount > wallet.balance) {
      return NextResponse.json(
        { error: "Amount exceeds wallet balance" },
        { status: 400 }
      );
    }

    // Create withdrawal (pending state). Money is held until admin marks paid.
    // We deduct immediately to prevent double-spending, and refund if rejected.
    const withdrawal = await db.withdrawal.create({
      data: {
        userId: user.id,
        amount,
        upiId,
        status: "pending",
      },
    });
    await db.incrementWallet(user.id, { balance: -amount });
    await db.transaction.create({
      data: {
        userId: user.id,
        type: "withdrawal",
        amount: -amount,
        status: "pending",
        description: `Withdrawal request to UPI ${upiId}`,
      },
    });

    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: "withdrawal_requested",
        target: withdrawal.id,
        meta: JSON.stringify({ amount, upiId }),
      },
    });

    return NextResponse.json({ withdrawal });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
