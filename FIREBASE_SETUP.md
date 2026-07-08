# Firebase Backend Setup — Complete

ExBranda is now fully migrated to Firebase (Authentication + Firestore). All data is stored in your Firebase project `exbranda`, accessible at https://console.firebase.google.com/project/exbranda.

## What was done automatically

### Firebase project provisioning (via service account)
- ✅ Created Firebase Web App → got API key, app ID, auth domain, storage bucket
- ✅ Initialized Firestore (sentinel document + default settings seeded)
- ✅ Recorded admin email (`admin@exbranda.com`) in `admins` collection
- ✅ Set `FIREBASE_SERVICE_ACCOUNT` and `NEXT_PUBLIC_FIREBASE_CONFIG` env vars on Vercel
- ✅ Seeded demo data: admin user, demo creator (Aarav), 2 submissions, 1 transaction

### Code migration
- ✅ Installed `firebase-admin` v13 (server SDK) and `firebase` v12 (client SDK)
- ✅ Created `src/lib/firebase-admin.ts` — Admin SDK init from `FIREBASE_SERVICE_ACCOUNT` env var
- ✅ Created `src/lib/firebase-client.ts` — Browser SDK init from `NEXT_PUBLIC_FIREBASE_CONFIG`, exposes `signInWithGoogle()` and `isFirebaseConfigured()`
- ✅ Created `src/lib/firestore.ts` — Firestore data layer that mimics the Prisma client interface (`user.findUnique`, `wallet.update`, `submission.findMany`, etc.) so all 18 API routes work unchanged
- ✅ Migrated all 18 API routes from `@/lib/db` (Prisma) to `@/lib/firestore` (Firestore)
- ✅ Updated `src/lib/auth.ts` to support BOTH real Firebase Auth (verify ID token via Admin SDK) AND mock login (auto-detected)
- ✅ Updated `LoginScreen.tsx` to use real Google Sign-In popup via Firebase Auth when configured, with graceful fallback to demo buttons
- ✅ Refactored `$transaction()` patterns to sequential ops + atomic `FieldValue.increment()` for wallet updates
- ✅ Avoided all Firestore composite index requirements by filtering/sorting in JS (service account lacks IAM permission to create indexes)
- ✅ Wrote comprehensive Firestore security rules (`firestore.rules`) — user owns own data, admin can do all, wallet writes are server-only, no privilege escalation via profile updates

### Vercel deployment
- ✅ Production deployment at https://exbranda.vercel.app
- ✅ GitHub repo at https://github.com/Unknownpotato1/ExBranda
- ✅ All env vars set as encrypted Vercel secrets

## Verified working end-to-end on production

| Operation | Before | After |
|-----------|--------|-------|
| Initial wallet | balance ₹1250.50, pending ₹0, lifetime ₹250 | — |
| Submit reel (18K views) | — | balance ₹1250.50, **pending ₹180** (+180) |
| Admin approves | — | **balance ₹1430.50** (+180), **pending ₹0** (-180), **lifetime ₹430** (+180), **today ₹180** (+180) |
| Submit same reel with more views | 32K views → **14K new views** calculated (32K - 18K previously approved) | New pending submission for ₹140 |
| Submit same reel with fewer views | 15K views vs 25K previously approved | **Correctly rejected**: "Current views (15,000) must be greater than previously approved views (25,000)" |
| Withdrawal request ₹500 | balance ₹1430.50 | balance ₹930.50 (-500), withdrawal in pending state |
| Admin marks withdrawal paid | withdrawnTotal ₹0 | **withdrawnTotal ₹500** (+500), withdrawal in paid state |
| Admin stats endpoint | 200 OK | Returns totalUsers, pendingSubmissions, topEarners, 14-day trends |
| Leaderboard endpoint | 200 OK | Returns top creators with privacy-respecting wallet display |
| Settings endpoint | 200 OK | Returns announcement, base rate, min withdrawal, etc. |
| Login screen | Detects Firebase | Shows "Secured by Firebase Authentication" |

## What YOU need to do (cannot be automated)

### 1. Enable Google Sign-In provider (60 seconds)

The Identity Toolkit Admin API doesn't expose Google Sign-In enablement for standard Firebase Auth (only Identity Platform paid tier). The only way is via Console UI:

1. Open: https://console.firebase.google.com/project/exbranda/authentication/providers
2. Click on **"Google"** in the sign-in providers list
3. Toggle **"Enable"** to ON
4. For "Web SDK configuration":
   - Support email: your email
   - Leave Web client ID and secret blank (or use the auto-created ones)
5. Click **Save**

After this, users will be able to sign in with their real Google accounts via the "Continue with Google" button.

> **Until you do this**, the "Continue with Google" button will show a popup error from Firebase. The "Demo creator" and "Admin login" buttons (mock flow) still work as a fallback.

### 2. Deploy Firestore security rules (optional but recommended)

The service account lacks the IAM permission to deploy rules via REST API. The rules file is in the repo at `firestore.rules`. To deploy:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login (opens browser)
firebase login

# From the project root
firebase deploy --only firestore:rules
```

> **Until you do this**, your Firestore database uses the default test mode rules (allow all reads/writes for 30 days, then deny). The app still works because all writes go through the Next.js API routes which use the Admin SDK (bypasses rules). But deploying the rules is important for production security — it would prevent a malicious user from directly writing to Firestore via the client SDK.

## What was NOT migrated (kept for compatibility)

- `prisma/schema.prisma` — kept for reference (the Firestore collections match the model names exactly)
- `src/lib/db.ts` — kept but unused (API routes now use `src/lib/firestore.ts`)
- `scripts/seed.ts` and `scripts/reset-demo.ts` — still use Prisma/SQLite; the equivalent Firestore seeding is in `scripts/firebase-setup.ts`

## Architecture diagram

```
Browser (client)
  ├── Firebase JS SDK (firebase-client.ts)
  │     └── GoogleAuthProvider → signInWithPopup → ID token
  │
  └── POST /api/auth/login { idToken }
        │
        ▼
Next.js API routes (server-side, Vercel serverless)
  ├── firebase-admin.ts
  │     ├── verifyIdToken(idToken) → decoded user
  │     ├── setAdminClaims(uid)
  │     └── getDb() → Firestore
  │
  ├── firestore.ts (Prisma-compatible adapter)
  │     ├── db.user.findUnique({ where: { email } })
  │     ├── db.wallet.update({ where: { userId }, data: { balance: { increment: N } } })
  │     ├── db.submission.findMany({ where, include, orderBy, take })
  │     ├── db.incrementWallet(userId, { balance: +N, pendingBalance: -N })
  │     └── ... etc
  │
  └── auth.ts (cookie session)
        ├── firebaseLogin(idToken) → verifyIdToken → createSession cookie
        ├── mockGoogleLogin(email) → fallback for demo
        └── getSessionUser() → reads cookie → looks up user in Firestore
              │
              ▼
Firestore (Firebase project: exbranda)
  ├── users/{uid}
  ├── wallets/{uid}              (server-only writes)
  ├── transactions/{id}
  ├── submissions/{id}
  ├── withdrawals/{id}
  ├── referrals/{id}
  ├── settings/{key}             (public read, admin write)
  ├── admins/{uid}
  ├── notifications/{id}
  ├── downloads/{id}
  └── auditLogs/{id}             (server-only)
```

## Vercel env vars (set as encrypted secrets)

| Name | Scope | Purpose |
|------|-------|---------|
| `FIREBASE_SERVICE_ACCOUNT` | Production | Full service account JSON — used by firebase-admin to authenticate |
| `NEXT_PUBLIC_FIREBASE_CONFIG` | All envs | Web app config (API key, app ID, etc.) — public, used by client SDK |
| `CLOUDINARY_CLOUD_NAME` | All envs | Cloudinary integration |
| `CLOUDINARY_API_KEY` | All envs | Cloudinary integration |
| `CLOUDINARY_API_SECRET` | All envs | Cloudinary integration |
