import { NextRequest, NextResponse } from "next/server";
import { mockGoogleLogin } from "@/lib/auth";
import { db, readyDb } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["user", "admin"]).optional().default("user"),
});

// POST /api/auth/login
// Mock Google Sign-In. In production, replace with Firebase Auth / Google OAuth.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    let { email, role } = parsed.data;

    // Ensure schema is ready before any query (Vercel serverless /tmp init)
    await readyDb();

    // Admin login: ensure admin@exbranda.com is admin
    if (role === "admin") {
      const admin = await db.user.findUnique({ where: { email } });
      if (!admin || admin.role !== "admin") {
        return NextResponse.json(
          { error: "Not an admin account" },
          { status: 403 }
        );
      }
    }

    const user = await mockGoogleLogin(email);
    if (user.banned) {
      return NextResponse.json({ error: "Account banned" }, { status: 403 });
    }

    return NextResponse.json({ user });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Login failed" }, { status: 500 });
  }
}
