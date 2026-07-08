import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/admin/users?q=...
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;
  const where: any = { role: "user" };
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { fullName: { contains: q } },
      { email: { contains: q } },
      { instagramHandle: { contains: q } },
      { referralCode: { contains: q.toUpperCase() } },
    ];
  }
  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { wallet: true },
  });
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      fullName: u.fullName,
      instagramHandle: u.instagramHandle,
      country: u.country,
      upiId: u.upiId,
      referralCode: u.referralCode,
      referralActive: u.referralActive,
      referralBonusPct: u.referralBonusPct,
      banned: u.banned,
      badges: u.badges ? JSON.parse(u.badges) : [],
      createdAt: u.createdAt,
      walletBalance: u.wallet?.balance || 0,
      lifetimeEarnings: u.wallet?.lifetimeEarnings || 0,
    })),
  });
}

// PATCH /api/admin/users — ban / unban / delete
// Body: { id, action: "ban" | "unban" | "delete" }
export async function PATCH(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { id, action } = body;
  if (!id || !["ban", "unban", "delete"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.role === "admin") {
    return NextResponse.json({ error: "Cannot modify admin" }, { status: 400 });
  }
  if (action === "ban") {
    await db.user.update({ where: { id }, data: { banned: true } });
  } else if (action === "unban") {
    await db.user.update({ where: { id }, data: { banned: false } });
  } else {
    await db.user.delete({ where: { id } });
  }
  await db.auditLog.create({
    data: {
      actorId: admin.id,
      action: `user_${action}`,
      target: id,
    },
  });
  return NextResponse.json({ ok: true });
}
