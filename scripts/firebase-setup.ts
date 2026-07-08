// Firebase project setup script — uses firebase-admin SDK to:
// 1. Initialize Admin SDK with service account
// 2. List/create web app via Firebase Management REST API (using admin SDK's credential)
// 3. Enable Google Sign-In
// 4. Initialize Firestore (creates collections)
// 5. Set admin custom claims
// 6. Print all config values for Vercel env vars

import * as fs from "fs";
import * as crypto from "crypto";
import admin from "firebase-admin";

const SA_PATH = process.argv[2] || "/tmp/firebase-sa.json";
const serviceAccount = JSON.parse(fs.readFileSync(SA_PATH, "utf-8"));
const PROJECT_ID = serviceAccount.project_id;

// Initialize Admin SDK
const existing = admin.apps;
const app: admin.app.App = existing.length ? existing[0] : admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: PROJECT_ID,
});

const db = app.firestore();
const authAdmin = app.auth();

// Get OAuth2 access token by signing a JWT with the service account private key
// and exchanging it at the token endpoint. This is the standard Google service
// account auth flow — no refresh token needed.
async function getAccessToken(scopes: string[]): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const header = { alg: "RS256", typ: "JWT" };
  const b64url = (s: string) => Buffer.from(s).toString("base64url");
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(serviceAccount.private_key, "base64url");
  const jwt = `${unsigned}.${signature}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  }).toString();

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  const j = JSON.parse(text);
  if (!j.access_token) {
    throw new Error(`Token exchange failed: ${text.slice(0, 400)}`);
  }
  return j.access_token;
}

async function main() {
  console.log(`\n=== Firebase project: ${PROJECT_ID} ===\n`);

  // 1) Get OAuth2 access token
  console.log("1) Getting OAuth2 access token…");
  const accessToken = await getAccessToken([
    "https://www.googleapis.com/auth/firebase",
    "https://www.googleapis.com/auth/cloud-platform",
  ]);
  console.log("   ✓ Got access token");

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const fetchJson = async (url: string, opts: any = {}, body?: string) => {
    const res = await fetch(url, { ...opts, headers: { ...authHeaders, ...(opts.headers || {}) }, body });
    const text = await res.text();
    let j: any = null;
    try { j = text ? JSON.parse(text) : null; } catch {}
    return { status: res.status, body: j, raw: text };
  };

  // 2) List web apps
  console.log("\n2) Listing Firebase web apps…");
  const listRes = await fetchJson(
    `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps`
  );
  let webApp = listRes.body?.apps?.find((a: any) => a.platform === "WEB");

  if (!webApp) {
    console.log("   No web app found — creating one…");
    const createRes = await fetchJson(
      `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps`,
      { method: "POST" },
      JSON.stringify({ displayName: "ExBranda Web" })
    );
    const opName = createRes.body?.name;
    if (opName) {
      console.log("   Waiting for web app creation…");
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const opRes = await fetchJson(`https://firebase.googleapis.com/v1beta1/${opName}`);
        if (opRes.body?.done) {
          webApp = opRes.body.response;
          break;
        }
      }
    }
  }

  let webConfig: any = null;
  if (webApp) {
    console.log(`   ✓ Web app: ${webApp.appId}`);
    console.log("\n3) Fetching web app config…");
    const cfgRes = await fetchJson(
      `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps/${webApp.appId}/config`
    );
    webConfig = cfgRes.body;
    if (webConfig) {
      console.log("   ✓ Web app config:");
      console.log("     apiKey:            ", webConfig.apiKey);
      console.log("     authDomain:        ", webConfig.authDomain);
      console.log("     projectId:         ", webConfig.projectId);
      console.log("     storageBucket:     ", webConfig.storageBucket);
      console.log("     messagingSenderId: ", webConfig.messagingSenderId);
      console.log("     appId:             ", webConfig.appId);
    }
  } else {
    console.log("   ✗ Could not create/find web app");
  }

  // 4) Try to enable Google Sign-In via Identity Toolkit
  console.log("\n4) Checking Google Sign-In provider…");
  const itRes = await fetchJson(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`
  );
  if (itRes.status === 200) {
    const cfg = itRes.body;
    const googleProvider = cfg.signIn?.identityPlatform?.find((p: any) => p.providerId === "google.com");
    if (googleProvider?.enabled) {
      console.log("   ✓ Google Sign-In already enabled");
    } else {
      console.log("   Google Sign-In not yet enabled — attempting to enable…");
      const updated = {
        ...cfg,
        signIn: {
          ...cfg.signIn,
          identityPlatform: [
            { providerId: "google.com", enabled: true },
            ...(cfg.signIn?.identityPlatform || []),
          ],
        },
      };
      const updRes = await fetchJson(
        `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=signIn`,
        { method: "PATCH" },
        JSON.stringify(updated)
      );
      if (updRes.status === 200) console.log("   ✓ Google Sign-In enabled");
      else console.log(`   ⚠ Could not enable (status ${updRes.status}). Enable manually in Console.`);
    }
  } else {
    console.log(`   ⚠ Identity Toolkit config not accessible (status ${itRes.status})`);
    console.log("     You may need to enable Identity Platform in the Console.");
  }

  // 5) Initialize Firestore by writing a sentinel document
  console.log("\n5) Initializing Firestore…");
  try {
    await db.collection("_init").doc("bootstrap").set({
      createdAt: new Date(),
      note: "ExBranda bootstrap document",
    });
    console.log("   ✓ Firestore is ready (sentinel document written)");

    // 6) Seed default settings
    console.log("\n6) Seeding default settings…");
    const settingsRef = db.collection("settings");
    const existing = await settingsRef.limit(1).get();
    if (existing.empty) {
      const batch = db.batch();
      const defaults = [
        { key: "referral_bonus_type", value: "rate_5pct" },
        { key: "referral_bonus_value", value: "0" },
        { key: "base_rate_per_10k", value: "100" },
        { key: "min_withdrawal", value: "500" },
        { key: "announcement", value: "Welcome to ExBranda! Earn ₹100 for every 10,000 views." },
        { key: "maintenance_mode", value: "false" },
      ];
      for (const s of defaults) {
        batch.set(settingsRef.doc(s.key), { ...s, updatedAt: new Date() });
      }
      await batch.commit();
      console.log("   ✓ Default settings seeded");
    } else {
      console.log("   ✓ Settings already exist");
    }

    // 7) Try to create admin user (will only work if a Firebase user with that email exists)
    console.log("\n7) Setting up admin user…");
    try {
      const adminUser = await authAdmin.getUserByEmail("admin@exbranda.com");
      await authAdmin.setCustomUserClaims(adminUser.uid, { role: "admin" });
      console.log(`   ✓ Admin claims set for existing user ${adminUser.uid}`);
    } catch (e: any) {
      if (e.code === "auth/user-not-found") {
        console.log("   ℹ admin@exbranda.com doesn't exist as a Firebase user yet.");
        console.log("     After the first Google Sign-In, run the promote-admin script.");
      } else {
        console.log("   ⚠ Could not check admin user:", e.message);
      }
    }

    // 8) Write admin record to Firestore so the admin login flow works
    console.log("\n8) Recording admin email in Firestore…");
    await db.collection("admins").doc("admin@exbranda.com").set({
      email: "admin@exbranda.com",
      role: "admin",
      createdAt: new Date(),
    }, { merge: true });
    console.log("   ✓ Admin email recorded");
  } catch (e: any) {
    console.log("   ⚠ Firestore init failed:", e.message);
    console.log("     You may need to create Firestore in the Console.");
  }

  // 9) Save web config
  if (webConfig) {
    fs.writeFileSync("/tmp/firebase-web-config.json", JSON.stringify(webConfig, null, 2));
    console.log("\n9) Web config saved to /tmp/firebase-web-config.json");
  }

  console.log("\n=== Setup complete ===\n");
  await app.delete();
}

main().catch(async (e) => {
  console.error("Setup failed:", e);
  try { await app.delete(); } catch {}
  process.exit(1);
});
