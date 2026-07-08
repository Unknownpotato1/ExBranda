import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/firestore";

// GET /api/admin/users?q=...
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;

  // Firestore doesn't support OR with contains across fields.
  // Fetch all users with role=user (limited), include wallet, filter in JS.
  let users = await db.user.findMany({
    where: { role: "user" },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { wallet: true },
  });

  if (q) {
    const ql = q.toLowerCase();
    users = users.filter(
      (u: any) =>
        u.name?.toLowerCase().includes(ql) ||
        u.fullName?.toLowerCase().includes(ql) ||
        u.email?.toLowerCase().includes(ql) ||
        u.instagramHandle?.toLowerCase().includes(ql) ||
        u.referralCode?.toUpperCase().includes(q.toUpperCase())
    );
  }

  return NextResponse.json({
    users: users.map((u: any) => ({
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
      badges: u.badges ? (typeof u.badges === "string" ? JSON.parse(u.badges) : u.badges) : [],
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
