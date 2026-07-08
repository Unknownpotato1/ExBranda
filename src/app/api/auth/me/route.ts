import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/firestore";
import type { WalletDTO } from "@/lib/types";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null, wallet: null });

  const wallet = await db.wallet.findUnique({ where: { userId: user.id } });
  const walletDTO: WalletDTO | null = wallet
    ? {
        balance: wallet.balance,
        pendingBalance: wallet.pendingBalance,
        lifetimeEarnings: wallet.lifetimeEarnings,
        withdrawnTotal: wallet.withdrawnTotal,
        todayEarnings: wallet.todayEarnings,
      }
    : null;

  return NextResponse.json({ user, wallet: walletDTO });
}
