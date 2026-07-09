import { NextRequest, NextResponse } from "next/server";
import { firebaseLogin, mockGoogleLogin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email().optional(),
  idToken: z.string().optional(),
  // NOTE: 'role' is intentionally NOT accepted from the client.
  // Admin role is determined solely by the user's email matching the
  // ADMIN_EMAIL constant in src/lib/auth.ts. No client can ever
  // escalate their own privileges.
});

// POST /api/auth/login
// Supports two flows:
// 1. REAL Firebase Auth: { idToken: "<Firebase ID JWT>" }
// 2. Mock (dev/demo): { email: "user@example.com" }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { email, idToken } = parsed.data;

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

    // The role is determined inside mockGoogleLogin based on ADMIN_EMAIL.
    // We do NOT pass any role from the client.
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
