// Auth utilities — cookie-based session
//
// Two login paths supported:
// 1. REAL Firebase Auth (production):
//    - Client signs in with Google via Firebase Auth JS SDK
//    - Client sends the Firebase ID token to /api/auth/login
//    - Server verifies the ID token via Firebase Admin SDK
//    - Server creates an ExBranda session cookie (with the user's uid)
//    - All subsequent requests use the session cookie (no Firebase token needed)
//
// 2. Mock Google login (dev / demo):
//    - Client POSTs an email to /api/auth/login
//    - Server creates a user in Firestore if not exists
//    - Server creates a session cookie
//
// The mock path is auto-detected (no idToken in request body).

import { cookies } from "next/headers";
import { db } from "./firestore";
import type { UserDTO } from "./types";
import { verifyIdToken, getAuthAdmin } from "./firebase-admin";

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
    role: (u.role as "user" | "admin") || "user",
    banned: u.banned || false,
    privacyHideWallet: u.privacyHideWallet || false,
    badges: u.badges || [],
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : new Date(u.createdAt || Date.now()).toISOString(),
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

// === REAL Firebase Auth login ===
// Verifies a Firebase ID token, creates or fetches the user in Firestore,
// and creates an ExBranda session cookie.
export async function firebaseLogin(idToken: string): Promise<UserDTO> {
  // Verify the ID token via Firebase Admin SDK
  const decoded = await verifyIdToken(idToken);
  const email = decoded.email;
  if (!email) throw new Error("No email in Firebase token");

  // Look up or create user in Firestore
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    // Generate a unique referral code
    const baseName = (email.split("@")[0] || "creator").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    const referralCode = await generateUniqueReferralCode(baseName);
    // Get display name from Firebase token, or use email
    const displayName = decoded.name || email.split("@")[0];
    user = await db.user.create({
      data: {
        email,
        name: displayName,
        referralCode,
        // Inherit role from Firebase custom claims if present
        role: decoded.role === "admin" ? "admin" : "user",
      },
    });
    // Create wallet
    await db.wallet.create({ data: { userId: user.id } });

    // If this user has admin claims in Firebase AND matches our admin email,
    // make them admin in Firestore too
    if (decoded.role === "admin" || email === "admin@exbranda.com") {
      await db.user.update({ where: { id: user.id }, data: { role: "admin" } });
      await db.admin.create({ data: { userId: user.id } });
    }
  } else {
    // Update role from Firebase custom claims if needed
    if (decoded.role === "admin" && user.role !== "admin") {
      await db.user.update({ where: { id: user.id }, data: { role: "admin" } });
      await db.admin.create({ data: { userId: user.id } });
      user = { ...user, role: "admin" };
    }
  }

  await createSession(user.id);
  return toUserDTO(user);
}

// === Mock Google login (dev/demo — used when Firebase Auth not configured) ===
const DEMO_NAMES = [
  "Aarav Sharma", "Diya Patel", "Vihaan Reddy", "Ananya Iyer", "Arjun Mehta",
  "Ishaan Gupta", "Saanvi Nair", "Kabir Singh", "Myra Verma", "Reyansh Kumar",
];

export async function mockGoogleLogin(email: string): Promise<UserDTO> {
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
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
    await db.wallet.create({ data: { userId: user.id } });
  }
  await createSession(user.id);
  return toUserDTO(user);
}

export async function generateUniqueReferralCode(base: string): Promise<string> {
  let code = base || "CREATOR";
  while (code.length < 5) code += Math.floor(Math.random() * 10);
  let attempt = 0;
  while (attempt < 50) {
    const exists = await db.user.findUnique({ where: { referralCode: code } });
    if (!exists) return code;
    code = base + Math.floor(Math.random() * 9000 + 1000);
    attempt++;
  }
  return base + Date.now().toString().slice(-4);
}

export { toUserDTO };
