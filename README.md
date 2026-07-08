# ExBranda — Earn by Promoting Brands

A production-ready, mobile-first web application that lets Instagram creators earn money by promoting the ExBranda logo in their Reels. Inspired by the clean aesthetics of Stripe, Linear, Vercel, and modern fintech dashboards.

> **Tagline:** Earn by Promoting Brands.

---

## ✨ Features

### Creator-facing
- **Google Sign-In** (mock — see "Production Swap" below)
- **One-time onboarding**: full name, Instagram handle, country, UPI ID, referral code capture
- **Dashboard** with wallet balance, today's earnings, pending earnings, lifetime earnings, withdrawn total, approved/pending/rejected reel counts, current pay rate
- **Submit Reel** with **duplicate-link detection** — only new views (current − previously approved) get paid. Never pays twice for the same views.
- **Live payout preview** as the creator types
- **Download Logo** (PNG, Transparent PNG, SVG, ZIP Brand Kit) with download counter
- **Wallet** with full transaction history (earnings, withdrawals, referral bonuses)
- **Withdraw** with validation: min ₹500, no decimals, no overdraft
- **Submission History** with filter tabs (all / pending / approved / rejected)
- **Profile** with editable UPI/Instagram/country, privacy toggle, referral code & link
- **Referral system** with unique code, share to WhatsApp / native share / copy link, +5% bonus that activates after referred user's first successful withdrawal
- **Settings** with light/dark/system theme, notification toggle, links to legal pages
- **Notifications** in-app (approval, rejection, withdrawal paid, referral activated, broadcast)
- **Leaderboard** with top earners and privacy-respecting display
- **FAQ**, **Contact Support**, **Legal pages** (Privacy, Terms, Disclaimer, Community Guidelines, Earnings Policy, Refund Policy)
- **Badges**: First Reel, 100K Views, 500K Views, 1M Views, Top Creator, Referral King
- **Confetti** on submission approval
- **Empty states**, **loading skeletons**, **404**, **offline-ready PWA**

### Admin panel (role-gated)
- **Stats dashboard** with 10 KPI cards, 14-day submissions trend (area chart), 14-day payouts trend (bar chart), top earners & top referrers
- **Submissions management**: approve / reject / edit views / edit payout, search by URL/username/email, dialog with adjustable values
- **Withdrawals management**: mark paid / reject, search, **CSV export**
- **Users management**: search by name/email/Instagram/referral code, ban / unban / delete
- **Auto referral activation**: when a referred user's first withdrawal is marked paid, the inviter's +5% bonus permanently activates

### Business logic (server-side, never trusts frontend)
- **Duplicate-link prevention**: same reel URL → only new views (current − sum of approved views) become pending
- **Pending view guard**: rejects submissions where currentViews ≤ previously approved views
- **Pending submission guard**: prevents new submission if there's already a pending one for that URL
- **Server-side payout calculation** with referral bonus support
- **Atomic transactions** for approval (move money from pending → balance, create transaction log, send notification, award badges, all in one DB transaction)
- **Atomic transactions** for withdrawals (deduct on request, refund on reject)
- **Self-referral prevention** and **first-referral-only** enforcement
- **Admin-only routes** enforced server-side via `requireAdmin()`
- **Audit logs** for every significant action

---

## 🏗 Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Animations | Framer Motion |
| Icons | lucide-react |
| Charts | Recharts |
| State | Zustand (client), TanStack Query (server, optional) |
| Theme | next-themes (light / dark / system) |
| Database | Prisma ORM + SQLite (dev) |
| Auth | Cookie-based session with mock Google Sign-In |
| Validation | Zod |
| PWA | manifest.json + icon.svg |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and Bun (or npm/yarn/pnpm)
- A Firebase project (for production) — see "Production Swap" below

### Install & Run

```bash
# Install dependencies
bun install   # or npm install

# Set up the database
cp .env.example .env
bun run db:push

# Seed demo data (admin + creator accounts, sample submissions)
bun run scripts/seed.ts

# Start dev server
bun run dev
```

Visit `http://localhost:3000`.

### Demo Accounts

| Role | Email | How to login |
|---|---|---|
| Creator | `creator@exbranda.com` | Click "Continue with Google" |
| Admin | `admin@exbranda.com` | Click "Admin login" |
| New user | (auto-generated) | Click "New account" |

To reset the demo data:
```bash
bun run scripts/reset-demo.ts
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx                 # Single route — handles auth/onboarding/app state
│   ├── layout.tsx               # Root layout with ThemeProvider & Toaster
│   ├── globals.css              # Premium design system (glass, gradients, aurora bg)
│   └── api/                     # All REST API routes
│       ├── auth/{login,logout,me}/
│       ├── user/{onboard,profile}/
│       ├── submissions/         # POST with duplicate-link detection
│       ├── wallet/              # GET wallet + transactions
│       ├── withdrawals/         # POST with validation, GET history
│       ├── downloads/           # POST log + GET count
│       ├── notifications/       # GET list + PATCH mark read
│       ├── referrals/           # GET referral stats
│       ├── leaderboard/         # GET top earners (privacy-respecting)
│       ├── settings/            # GET public settings
│       └── admin/{stats,submissions,withdrawals,users}/  # Admin-only
├── components/
│   ├── ui/                      # shadcn/ui (auto-generated)
│   ├── layout/                  # AppShell, BottomNav, TopBar, AnnouncementBanner
│   ├── auth/                    # LoginScreen, OnboardingForm
│   ├── dashboard/               # DashboardView
│   ├── submissions/             # SubmitReelView, HistoryView, DownloadLogoView
│   ├── wallet/                  # WalletView, WithdrawView
│   ├── profile/                 # ProfileView, SettingsView, ReferralsView
│   ├── info/                    # NotificationsView, FAQView, ContactView, LegalView, LeaderboardView
│   ├── admin/                   # AdminPanel (with Stats / Submissions / Withdrawals / Users tabs)
│   ├── common/                  # Logo, Confetti, EmptyState, Skeletons
│   └── theme-provider.tsx
├── lib/
│   ├── db.ts                    # Prisma client
│   ├── auth.ts                  # Cookie session + mock Google login
│   ├── payout.ts                # Payout calculation + INR/number formatting
│   ├── types.ts                 # Shared DTOs & constants
│   └── utils.ts                 # cn() helper
├── store/
│   └── appStore.ts              # Zustand store (view state + theme + celebrate)
└── prisma/
    └── schema.prisma            # All collections: users, wallets, transactions,
                                 # submissions, withdrawals, referrals, settings,
                                 # admins, notifications, downloads, auditLogs

public/
├── icon.svg                     # ExBranda gradient logo
├── manifest.json                # PWA manifest
├── robots.txt
└── sitemap.xml
```

---

## 🔁 Production Swap (Firebase)

This MVP uses **Prisma + SQLite** for persistence and a **mock Google Sign-In** for auth, because the dev sandbox doesn't include Firebase. To deploy to production with real Firebase:

### 1. Auth — Replace `src/lib/auth.ts`
Replace the `mockGoogleLogin` function with real Firebase Auth + Google OAuth:

```ts
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const result = await signInWithPopup(auth, provider);
// Then create session cookie from result.user
```

Or use NextAuth.js with the Google provider.

### 2. Database — Replace Prisma with Firestore
Each Prisma model maps directly to a Firestore collection of the same name:

| Prisma Model | Firestore Collection |
|---|---|
| User | `users` |
| Wallet | `wallets` |
| Transaction | `transactions` |
| Submission | `submissions` |
| Withdrawal | `withdrawals` |
| Referral | `referrals` |
| Setting | `settings` |
| Admin | `admins` |
| Notification | `notifications` |
| Download | `downloads` |
| AuditLog | `auditLogs` |

Field names are identical. Replace each `db.*` call in API routes with the equivalent Firestore SDK call:
- `db.user.findUnique({ where: { email } })` → `db.collection("users").where("email", "==", email).get()`
- `db.submission.create({ data })` → `db.collection("submissions").add(data)`
- etc.

### 3. Logo storage — Cloudinary
Replace the in-browser logo generation in `DownloadLogoView.tsx` with Cloudinary URLs:

```ts
const FILES = [
  { id: "png", url: "https://res.cloudinary.com/<cloud>/image/upload/v1/exbranda/logo.png" },
  // ...
];
```

### 4. Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write only their own user doc & wallet
    match /users/{userId} {
      allow read: if request.auth.uid == userId || isAdmin();
      allow update: if request.auth.uid == userId;
      allow create: if request.auth.uid == userId;
    }
    match /wallets/{walletId} {
      allow read: if request.auth.uid == resource.data.userId;
      // Writes only from server (Cloud Functions) — never from client
      allow write: if false;
    }
    // Submissions — user can create, only admin can update
    match /submissions/{subId} {
      allow read: if request.auth.uid == resource.data.userId || isAdmin();
      allow create: if request.auth.uid == request.resource.data.userId;
      allow update, delete: if isAdmin();
    }
    // Withdrawals — user can create, only admin can update
    match /withdrawals/{wId} {
      allow read: if request.auth.uid == resource.data.userId || isAdmin();
      allow create: if request.auth.uid == request.resource.data.userId;
      allow update, delete: if isAdmin();
    }
    // Notifications — user reads/updates own
    match /notifications/{nId} {
      allow read, update: if request.auth.uid == resource.data.userId;
      allow create: if isAdmin(); // or via Cloud Function
    }
    // Everything else — admin only
    match /{document=**} {
      allow read, write: if isAdmin();
    }
    function isAdmin() {
      return request.auth.token.admin == true;
    }
  }
}
```

### 5. Server-side payout validation (Cloud Functions)
Move all wallet balance updates to Cloud Functions triggers (`onCreate` on submissions/withdrawals). Never let the client write to wallet balances.

### 6. Deploy to Vercel
```bash
vercel --prod
```

Set environment variables in the Vercel dashboard:
- `DATABASE_URL` (or Firebase config)
- `NEXT_PUBLIC_FIREBASE_*` keys
- `CLOUDINARY_*` keys

---

## 🧮 Payout Calculation

```
Default rate:  ₹100 per 10,000 views
Referral rate: ₹105 per 10,000 views (+5% bonus)

newViews = currentViews − previouslyApprovedViews
payout   = (newViews / 10,000) × currentRate
```

Internally uses `Float` with full precision. Display rounds to 2 decimals via `Intl.NumberFormat("en-IN", { currency: "INR" })`.

---

## 🛡 Security Notes

- **Cookie-based sessions**: httpOnly, sameSite=lax, signed (replace with JWT in production)
- **Admin role checks** enforced server-side via `requireAdmin()` in every `/api/admin/*` route
- **All wallet mutations** happen inside `db.$transaction()` blocks
- **All inputs validated** with Zod schemas
- **Self-referral blocked** at the `/api/user/onboard` level
- **First-referral-only** enforced via Prisma `@@unique([referredId])` constraint
- **Audit logs** record every admin action with actor + target + metadata
- **Banned users** cannot log in or submit

---

## 🎨 Design System

- **Color palette**: Emerald/teal primary with chartreuse + cyan accents (no indigo/blue)
- **Glassmorphism**: `.glass` and `.glass-strong` utility classes
- **Aurora gradient background**: `.bg-aurora` with radial color blooms
- **Grid texture**: `.bg-grid` subtle dot grid
- **Premium button shine**: `.btn-shine` hover sweep effect
- **Glow shadows**: `.glow-primary` for primary CTAs
- **Floating bottom nav**: glass with active indicator (Framer Motion `layoutId`)
- **Safe-area aware**: respects iOS notch / home indicator
- **Skeleton shimmer**: `.shimmer` for loading states
- **Custom slim scrollbars**

---

## 📝 Available Scripts

| Script | Description |
|---|---|
| `bun run dev` | Start dev server (port 3000) |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push Prisma schema to database |
| `bun run db:generate` | Regenerate Prisma client |
| `bun run scripts/seed.ts` | Seed admin + demo creator + sample data |
| `bun run scripts/reset-demo.ts` | Reset creator's submissions/wallet to clean demo state |
| `bun run scripts/check-icons.cjs` | Verify all lucide-react imports are valid |

---

## 🗺 Roadmap (Future-ready)

The architecture is structured to make these future additions easy:
- **Campaigns** — multiple brand logos with different payout rates (already supported via `ratePer10k` per submission)
- **Sponsor marketplace** — new collections + admin views
- **AI verification** — auto-check logo presence using VLM before manual review
- **Video analysis** — fetch reel view counts automatically via Instagram Graph API
- **Mobile app** — React Native using the same REST API
- **Multi-currency** — replace INR formatting with locale-aware formatter
- **Webhooks** — notify external systems on approval/payout events

---

## 📄 License

Proprietary — © ExBranda. All rights reserved.
