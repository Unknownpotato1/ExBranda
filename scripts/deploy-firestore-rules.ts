// Deploy Firestore security rules to the project.
// Usage: bun run scripts/deploy-firestore-rules.ts /path/to/service-account.json

import * as fs from "fs";
import * as crypto from "crypto";

const SA_PATH = process.argv[2] || "/tmp/firebase-sa.json";
const RULES_PATH = process.argv[3] || "./firestore.rules";
const sa = JSON.parse(fs.readFileSync(SA_PATH, "utf-8"));
const PROJECT_ID = sa.project_id;

async function getAccessToken(scopes: string[]): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
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
  const signature = signer.sign(sa.private_key, "base64url");
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
  if (!j.access_token) throw new Error(`Token exchange failed: ${text.slice(0, 400)}`);
  return j.access_token;
}

async function main() {
  console.log(`\n=== Deploying Firestore rules to ${PROJECT_ID} ===\n`);

  const rules = fs.readFileSync(RULES_PATH, "utf-8");
  console.log(`Loaded ${rules.length} bytes of rules from ${RULES_PATH}`);

  const token = await getAccessToken([
    "https://www.googleapis.com/auth/firebase",
    "https://www.googleapis.com/auth/cloud-platform",
  ]);
  console.log("✓ Got access token");

  // The Firestore Admin API endpoint for updating rules
  // PATCH https://firestore.googleapis.com/v1/projects/{project}/databases/(default)
  // with body containing the rules
  const body = JSON.stringify({
    name: `projects/${PROJECT_ID}/databases/(default)`,
    etag: undefined,
    source_file: undefined,
  });

  // Actually the right endpoint is the Rules API:
  // PUT https://firebaserules.googleapis.com/v1/projects/{project}/rulesets
  // But the simpler way is to use the Firestore-specific rules endpoint:
  // PATCH https://firestore.googleapis.com/v1/projects/{project}/databases/(default)
  // OR use the firebase.rules.v1.Source API.

  // The correct modern API: create a new ruleset, then release it.
  // Step 1: Create ruleset
  const sourceBody = JSON.stringify({
    source: {
      files: [
        {
          name: "firestore.rules",
          content: rules,
        },
      ],
    },
  });

  console.log("\n1) Creating new ruleset…");
  const createRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: sourceBody,
    }
  );
  const createText = await createRes.text();
  if (!createRes.ok) {
    console.error(`✗ Failed to create ruleset (status ${createRes.status}):`, createText.slice(0, 500));
    process.exit(1);
  }
  const ruleset = JSON.parse(createText);
  const rulesetName = ruleset.name; // e.g. "projects/exbranda/rulesets/abc123"
  console.log(`✓ Created ruleset: ${rulesetName}`);

  // Step 2: Release the ruleset to cloud.firestore
  console.log("\n2) Releasing ruleset to cloud.firestore…");
  const releaseBody = JSON.stringify({
    name: `projects/${PROJECT_ID}/releases/cloud.firestore`,
    rulesetName,
  });
  // Try CREATE first (if release doesn't exist), then fall back to PATCH
  const releaseRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: releaseBody,
    }
  );
  const releaseText = await releaseRes.text();
  if (!releaseRes.ok) {
    console.error(`✗ Failed to release (status ${releaseRes.status}):`, releaseText.slice(0, 500));
    // Try POST (create new release)
    console.log("\nTrying POST instead…");
    const postRes = await fetch(
      `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: releaseBody,
      }
    );
    const postText = await postRes.text();
    if (!postRes.ok) {
      console.error(`✗ POST failed:`, postText.slice(0, 500));
      process.exit(1);
    }
    console.log("✓ Released (via POST)");
  } else {
    console.log("✓ Released (via PATCH)");
  }

  console.log("\n=== Firestore rules deployed successfully ===\n");
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
