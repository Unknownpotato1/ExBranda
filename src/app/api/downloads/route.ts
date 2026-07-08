import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/firestore";

// GET /api/downloads — total downloads by current user
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const count = await db.download.count({ where: { userId: user.id } });
  return NextResponse.json({ count });
}

// POST /api/downloads — log a download
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const fileType = ["png", "transparent_png", "svg", "zip"].includes(body.fileType)
      ? body.fileType
      : "png";
    await db.download.create({
      data: { userId: user.id, fileType },
    });
    const count = await db.download.count({ where: { userId: user.id } });
    return NextResponse.json({ ok: true, count });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
