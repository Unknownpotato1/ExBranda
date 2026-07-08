// Firebase Admin SDK — server-side only.
// Reads credentials from FIREBASE_SERVICE_ACCOUNT env var (JSON string)
// or from GOOGLE_APPLICATION_CREDENTIALS file path.

import { initializeApp, getApps, cert, type App } from "firebase-admin";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let _app: App | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

function getApp(): App {
  if (_app) return _app;
  const existing = getApps();
  if (existing.length) {
    _app = existing[0];
    return _app;
  }

  // Try FIREBASE_SERVICE_ACCOUNT env var first (Vercel production)
  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saEnv) {
    try {
      const sa = JSON.parse(saEnv);
      _app = initializeApp({
        credential: cert(sa),
        projectId: sa.project_id,
        storageBucket: sa.storageBucket || `${sa.project_id}.appspot.com`,
      });
      return _app;
    } catch (e) {
      console.error("[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT:", e);
    }
  }

  // Fall back to GOOGLE_APPLICATION_CREDENTIALS file path (local dev)
  _app = initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "exbranda",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "exbranda.firebasestorage.app",
  });
  return _app;
}

export function getDb(): Firestore {
  if (!_db) _db = getFirestore(getApp());
  return _db;
}

export function getAuthAdmin(): Auth {
  if (!_auth) _auth = getAuth(getApp());
  return _auth;
}

// Server-side only — used by /api/auth/login to verify Firebase ID tokens
export async function verifyIdToken(idToken: string) {
  const auth = getAuthAdmin();
  return auth.verifyIdToken(idToken);
}

// Set admin custom claims
export async function setAdminClaims(uid: string) {
  const auth = getAuthAdmin();
  await auth.setCustomUserClaims(uid, { role: "admin" });
}

// Get user by email
export async function getUserByEmail(email: string) {
  try {
    return await getAuthAdmin().getUserByEmail(email);
  } catch {
    return null;
  }
}

// Create user (if not exists)
export async function getOrCreateUser(email: string, displayName?: string) {
  const auth = getAuthAdmin();
  try {
    return await auth.getUserByEmail(email);
  } catch {
    return await auth.createUser({
      email,
      displayName,
      emailVerified: true,
    });
  }
}
