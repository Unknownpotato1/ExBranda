// Firebase Admin SDK — server-side only.
// Reads credentials from FIREBASE_SERVICE_ACCOUNT env var (JSON string)
// or from GOOGLE_APPLICATION_CREDENTIALS file path.
//
// NOTE: firebase-admin v13 uses `export =` (CommonJS), so we import the
// default namespace as `admin` and access admin.initializeApp, admin.credential, etc.

import admin from "firebase-admin";

let _app: admin.app.App | null = null;
let _db: admin.firestore.Firestore | null = null;
let _auth: admin.auth.Auth | null = null;

function getApp(): admin.app.App {
  if (_app) return _app;
  const existing = admin.apps;
  if (existing.length) {
    _app = existing[0];
    return _app;
  }

  // Try FIREBASE_SERVICE_ACCOUNT env var first (Vercel production)
  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saEnv) {
    try {
      const sa = JSON.parse(saEnv);
      _app = admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId: sa.project_id,
        storageBucket: sa.storageBucket || `${sa.project_id}.appspot.com`,
      });
      return _app;
    } catch (e) {
      console.error("[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT:", e);
    }
  }

  // Fall back to GOOGLE_APPLICATION_CREDENTIALS file path (local dev)
  _app = admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "exbranda",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "exbranda.firebasestorage.app",
  });
  return _app;
}

export function getDb(): admin.firestore.Firestore {
  if (!_db) _db = getApp().firestore();
  return _db;
}

export function getAuthAdmin(): admin.auth.Auth {
  if (!_auth) _auth = getApp().auth();
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
