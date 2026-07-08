import { NextRequest, NextResponse } from "next/server";
import { firebaseLogin, mockGoogleLogin, getSessionUser } from "@/lib/auth";
import { db } from "@/lib/firestore";
import { z } from "zod";

const schema = z.object({
  email: z.string().email().optional(),
  role: z.enum(["user", "admin"]).optional().default("user"),
  idToken: z.string().optional(),
});

// POST /api/auth/login
// Supports two flows:
// 1. REAL Firebase Auth: { idToken: "<Firebase ID JWT>" }
// 2. Mock (dev/demo): { email: "user@example.com", role: "user"|"admin" }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { email, role, idToken } = parsed.data;

    // === Flow 1: REAL Firebase Auth ===
    if (idToken) {
      const user = await firebaseLogin(idToken);
      if (user.banned) {
        return NextResponse.json({ error: "Account banned" }, { status: 403 });
      }
      return NextResponse.json({ user, authMode: "firebase" });
    }

    // === Flow 2: Mock login (dev/demo) ===
    if (!email) {
      return NextResponse.json({ error: "Email or idToken required" }, { status: 400 });
    }

    // Admin login: ensure the email is registered as an admin
    if (role === "admin") {
      const admin = await db.user.findUnique({ where: { email } });
      if (!admin || admin.role !== "admin") {
        return NextResponse.json({ error: "Not an admin account" }, { status: 403 });
      }
    }

    const user = await mockGoogleLogin(email);
    if (user.banned) {
      return NextResponse.json({ error: "Account banned" }, { status: 403 });
    }

    return NextResponse.json({ user, authMode: "mock" });
  } catch (e: any) {
    console.error("[auth/login] error:", e);
    return NextResponse.json({ error: e?.message || "Login failed" }, { status: 500 });
  }
}
