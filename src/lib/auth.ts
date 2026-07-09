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
    photoURL: u.photoURL || null,
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

// The single email that is allowed to be admin. No other account can
// ever get admin role — not via the login route, not via the profile page,
// not via the API. This is the only gate.
const ADMIN_EMAIL = "shahbazahmad9783@gmail.com";

// Helper: ensure a user has admin role + admin record if they match the admin email
async function ensureAdminRole(userId: string, email: string): Promise<void> {
  if (email.toLowerCase() !== ADMIN_EMAIL) return;
  await db.user.update({ where: { id: userId }, data: { role: "admin" } });
  try {
    await db.admin.create({ data: { userId } });
  } catch {
    // Already exists — that's fine
  }
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
    // Auto-admin: if this is the designated admin email, create as admin
    const isAdminEmail = email.toLowerCase() === ADMIN_EMAIL;
    user = await db.user.create({
      data: {
        email,
        name: displayName,
        referralCode,
        role: isAdminEmail ? "admin" : "user",
      },
    });
    // Create wallet
    await db.wallet.create({ data: { userId: user.id } });

    // If admin email, also create admin record
    if (isAdminEmail) {
      try {
        await db.admin.create({ data: { userId: user.id } });
      } catch {
        // Already exists
      }
    }
  } else {
    // Existing user — ensure admin role is correct for the admin email
    const isAdminEmail = email.toLowerCase() === ADMIN_EMAIL;
    if (isAdminEmail && user.role !== "admin") {
      await db.user.update({ where: { id: user.id }, data: { role: "admin" } });
      try {
        await db.admin.create({ data: { userId: user.id } });
      } catch {
        // Already exists
      }
      user = { ...user, role: "admin" };
    }
    // SECURITY: if a non-admin-email user somehow has admin role, strip it
    if (!isAdminEmail && user.role === "admin") {
      await db.user.update({ where: { id: user.id }, data: { role: "user" } });
      user = { ...user, role: "user" };
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
  // SECURITY: never allow the mock login to specify a role — the role is
  // determined solely by whether the email matches ADMIN_EMAIL.
  const isAdminEmail = email.toLowerCase() === ADMIN_EMAIL;

  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    const baseName = (email.split("@")[0] || "creator").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    const referralCode = await generateUniqueReferralCode(baseName);
    // For the admin email, use a proper name; for demo, use a random name
    const displayName = isAdminEmail
      ? "Shahbaz Ahmad"
      : DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
    user = await db.user.create({
      data: {
        email,
        name: displayName,
        fullName: isAdminEmail ? "Shahbaz Ahmad" : undefined,
        referralCode,
        role: isAdminEmail ? "admin" : "user",
      },
    });
    await db.wallet.create({ data: { userId: user.id } });
    if (isAdminEmail) {
      try {
        await db.admin.create({ data: { userId: user.id } });
      } catch {
        // Already exists
      }
    }
  } else {
    // Existing user — sync admin role
    if (isAdminEmail && user.role !== "admin") {
      await db.user.update({ where: { id: user.id }, data: { role: "admin" } });
      try {
        await db.admin.create({ data: { userId: user.id } });
      } catch {
        // Already exists
      }
      user = { ...user, role: "admin" };
    }
    if (!isAdminEmail && user.role === "admin") {
      await db.user.update({ where: { id: user.id }, data: { role: "user" } });
      user = { ...user, role: "user" };
    }
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
