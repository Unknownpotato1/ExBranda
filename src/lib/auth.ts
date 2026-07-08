// Auth utilities — cookie-based session with mock Google sign-in
// In production, replace `mockGoogleLogin` with real Firebase Auth / Google OAuth.

import { cookies } from "next/headers";
import { db, readyDb } from "./db";
import type { UserDTO } from "./types";

export const SESSION_COOKIE = "exbranda_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function toUserDTO(u: any): UserDTO {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    fullName: u.fullName,
    instagramHandle: u.instagramHandle,
    country: u.country,
    upiId: u.upiId,
    referralCode: u.referralCode,
    referredBy: u.referredBy,
    referralActive: u.referralActive,
    referralBonusPct: u.referralBonusPct,
    role: u.role as "user" | "admin",
    banned: u.banned,
    privacyHideWallet: u.privacyHideWallet,
    badges: u.badges ? JSON.parse(u.badges) : [],
    createdAt: u.createdAt.toISOString(),
  };
}

// Very lightweight session encoding (NOT cryptographically secure — replace with JWT in prod)
function encodeSession(payload: { uid: string; exp: number }): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeSession(token: string): { uid: string; exp: number } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(uid: string): Promise<void> {
  const token = encodeSession({ uid, exp: Date.now() + SESSION_TTL_SECONDS * 1000 });
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<UserDTO | null> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = decodeSession(token);
  if (!session) return null;
  await readyDb();
  const user = await db.user.findUnique({ where: { id: session.uid } });
  if (!user) return null;
  if (user.banned) return null;
  return toUserDTO(user);
}

export async function requireUser(): Promise<UserDTO> {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHORIZED");
  return u;
}

export async function requireAdmin(): Promise<UserDTO> {
  const u = await requireUser();
  if (u.role !== "admin") throw new Error("FORBIDDEN");
  return u;
}

// Mock Google sign-in — generates a deterministic user based on email.
// In production: replace with Firebase Auth / NextAuth Google provider.
const DEMO_NAMES = [
  "Aarav Sharma", "Diya Patel", "Vihaan Reddy", "Ananya Iyer", "Arjun Mehta",
  "Ishaan Gupta", "Saanvi Nair", "Kabir Singh", "Myra Verma", "Reyansh Kumar",
];

export async function mockGoogleLogin(email: string): Promise<UserDTO> {
  await readyDb();
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    // Generate a unique referral code
    const baseName = (email.split("@")[0] || "creator").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    const referralCode = await generateUniqueReferralCode(baseName);
    const demoName = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
    user = await db.user.create({
      data: {
        email,
        name: demoName,
        referralCode,
      },
    });
    // Create wallet
    await db.wallet.create({ data: { userId: user.id } });
  }
  await createSession(user.id);
  return toUserDTO(user);
}

export async function generateUniqueReferralCode(base: string): Promise<string> {
  let code = base || "CREATOR";
  // Pad to at least 5 chars
  while (code.length < 5) code += Math.floor(Math.random() * 10);
  let attempt = 0;
  while (attempt < 50) {
    const exists = await db.user.findUnique({ where: { referralCode: code } });
    if (!exists) return code;
    code = base + Math.floor(Math.random() * 9000 + 1000);
    attempt++;
  }
  // Fallback
  return base + Date.now().toString().slice(-4);
}

export { toUserDTO };
