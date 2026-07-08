// Provision Firestore composite indexes required by ExBranda queries.
// Uses the Firestore Admin REST API to create indexes (idempotent — if an
// index already exists, the API returns ALREADY_EXISTS and we skip it).
//
// Usage: bun run scripts/provision-firestore-indexes.ts /path/to/service-account.json

import * as fs from "fs";
import * as crypto from "crypto";

const SA_PATH = process.argv[2] || "/tmp/firebase-sa.json";
const sa = JSON.parse(fs.readFileSync(SA_PATH, "utf-8"));
const PROJECT_ID = sa.project_id;

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  };
  const header = { alg: "RS256", typ: "JWT" };
  const b64url = (s: string) => Buffer.from(s).toString("base64url");
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(sa.private_key, "base64url");
  const jwt = `${unsigned}.${signature}`;
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  }).toString();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = await r.json();
  return j.access_token;
}

// Indexes we need (collection, fields, queryScope)
// Each field is { fieldPath, order: "ASCENDING" | "DESCENDING" }
const INDEXES = [
  // users: filter by role, sort by createdAt desc
  {
    collection: "users",
    fields: [
      { fieldPath: "role", order: "ASCENDING" },
      { fieldPath: "createdAt", order: "DESCENDING" },
    ],
  },
  // users: filter by role, sort by createdAt asc (for counting today's new users)
  {
    collection: "users",
    fields: [
      { fieldPath: "role", order: "ASCENDING" },
      { fieldPath: "createdAt", order: "ASCENDING" },
    ],
  },
  // submissions: filter by status, sort by createdAt desc
  {
    collection: "submissions",
    fields: [
      { fieldPath: "status", order: "ASCENDING" },
      { fieldPath: "createdAt", order: "DESCENDING" },
    ],
  },
  // submissions: filter by userId, sort by createdAt desc (user's submission history)
  {
    collection: "submissions",
    fields: [
      { fieldPath: "userId", order: "ASCENDING" },
      { fieldPath: "createdAt", order: "DESCENDING" },
    ],
  },
  // submissions: filter by userId + status, sort by createdAt (for badges aggregation)
  {
    collection: "submissions",
    fields: [
      { fieldPath: "userId", order: "ASCENDING" },
      { fieldPath: "status", order: "ASCENDING" },
    ],
  },
  // withdrawals: filter by status, sort by createdAt desc
  {
    collection: "withdrawals",
    fields: [
      { fieldPath: "status", order: "ASCENDING" },
      { fieldPath: "createdAt", order: "DESCENDING" },
    ],
  },
  // withdrawals: filter by userId, sort by createdAt desc (user's withdrawal history)
  {
    collection: "withdrawals",
    fields: [
      { fieldPath: "userId", order: "ASCENDING" },
      { fieldPath: "createdAt", order: "DESCENDING" },
    ],
  },
  // withdrawals: filter by userId + status (for prior-paid check)
  {
    collection: "withdrawals",
    fields: [
      { fieldPath: "userId", order: "ASCENDING" },
      { fieldPath: "status", order: "ASCENDING" },
    ],
  },
  // transactions: filter by userId, sort by createdAt desc
  {
    collection: "transactions",
    fields: [
      { fieldPath: "userId", order: "ASCENDING" },
      { fieldPath: "createdAt", order: "DESCENDING" },
    ],
  },
  // notifications: filter by userId + read, sort by createdAt desc
  {
    collection: "notifications",
    fields: [
      { fieldPath: "userId", order: "ASCENDING" },
      { fieldPath: "createdAt", order: "DESCENDING" },
    ],
  },
  // referrals: filter by referrerId, sort by createdAt desc
  {
    collection: "referrals",
    fields: [
      { fieldPath: "referrerId", order: "ASCENDING" },
      { fieldPath: "createdAt", order: "DESCENDING" },
    ],
  },
  // referrals: filter by status, sort by createdAt desc
  {
    collection: "referrals",
    fields: [
      { fieldPath: "status", order: "ASCENDING" },
      { fieldPath: "createdAt", order: "DESCENDING" },
    ],
  },
  // wallets: sort by lifetimeEarnings desc (for leaderboard)
  {
    collection: "wallets",
    fields: [
      { fieldPath: "lifetimeEarnings", order: "DESCENDING" },
    ],
  },
  // downloads: filter by userId
  {
    collection: "downloads",
    fields: [
      { fieldPath: "userId", order: "ASCENDING" },
    ],
  },
];

async function main() {
  console.log(`\n=== Provisioning Firestore indexes for ${PROJECT_ID} ===\n`);
  const token = await getAccessToken();

  for (const idx of INDEXES) {
    // Firestore Index API expects fields array with {fieldPath, order}
    // and the collectionId is in the URL path. Body should NOT include collectionId.
    const body = {
      fields: idx.fields,
      queryScope: "COLLECTION",
    };
    console.log(`Creating index on ${idx.collection} (${idx.fields.map(f => `${f.fieldPath} ${f.order}`).join(", ")})…`);
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/collectionGroups/${idx.collection}/indexes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    const text = await res.text();
    if (res.status === 200 || res.status === 201) {
      const j = JSON.parse(text);
      console.log(`  ✓ Created (operation: ${j.name || "ok"})`);
    } else if (res.status === 409 || text.includes("ALREADY_EXISTS")) {
      console.log(`  ✓ Already exists`);
    } else {
      console.log(`  ⚠ Status ${res.status}: ${text.slice(0, 200)}`);
    }
  }

  console.log("\n=== Done. Indexes may take a few minutes to be ready. ===\n");
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
