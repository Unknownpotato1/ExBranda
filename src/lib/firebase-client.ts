// Firebase client SDK — browser-side Firebase Auth (Google Sign-In)
// Reads config from NEXT_PUBLIC_FIREBASE_CONFIG env var (JSON string)
// or from individual NEXT_PUBLIC_FIREBASE_* env vars.

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";

let _app: FirebaseApp | null = null;

function getApp(): FirebaseApp {
  if (_app) return _app;
  const existing = getApps();
  if (existing.length) {
    _app = existing[0];
    return _app;
  }

  // Try NEXT_PUBLIC_FIREBASE_CONFIG (JSON string of full config)
  const cfgEnv = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  let config: Record<string, string> = {};
  if (cfgEnv) {
    try {
      config = JSON.parse(cfgEnv);
    } catch {}
  } else {
    // Fall back to individual env vars
    config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    };
  }

  if (!config.apiKey) {
    throw new Error("Firebase config not set. Set NEXT_PUBLIC_FIREBASE_CONFIG env var.");
  }

  _app = initializeApp(config);
  return _app;
}

let _auth: Auth | null = null;
function getFirebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(getApp());
  return _auth;
}

export async function signInWithGoogle(): Promise<{
  user: User;
  idToken: string;
}> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  return { user: result.user, idToken };
}

export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(getFirebaseAuth());
  } catch {}
}

export function onAuthChanged(cb: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), cb);
}

// Public config for the LoginScreen to display
export function getFirebaseConfig() {
  const cfgEnv = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  if (cfgEnv) {
    try { return JSON.parse(cfgEnv); } catch {}
  }
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function isFirebaseConfigured(): boolean {
  const cfg = getFirebaseConfig();
  return Boolean(cfg.apiKey && cfg.projectId && cfg.appId);
}
