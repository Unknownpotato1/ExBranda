---
Task ID: ExBranda-MVP
Agent: main (Super Z)
Task: Build a production-ready, mobile-first web application named ExBranda — Instagram creators earn money by promoting the ExBranda logo in their Reels.

Work Log:
- Initialized fullstack-dev environment (Next.js 16 + Tailwind 4 + shadcn/ui + Prisma + SQLite)
- Designed Prisma schema with 11 collections: users, wallets, transactions, submissions, withdrawals, referrals, settings, admins, notifications, downloads, auditLogs
- Built cookie-based session auth with mock Google Sign-In (admin + creator demo accounts)
- Implemented duplicate-link detection system: only new views (current − previously approved) become pending; server-side validation prevents replays
- Built payout calculation with referral bonus support (₹100/10K base, +5% with active referral)
- Built premium UI: glassmorphism, aurora gradient bg, grid texture, dark/light/system themes, framer-motion animations, sticky floating bottom nav with iOS safe-area support
- Built 15 views: Login, Onboarding, Dashboard, Submit Reel, Download Logo, Wallet, Withdraw, History, Profile, Settings, Referrals, Notifications, FAQ, Contact, Legal, Leaderboard, Admin Panel (Stats/Submissions/Withdrawals/Users)
- Built admin approval flow with atomic transactions: approve/reject/edit views/edit payout → moves money pending→balance, creates transaction log, sends notification, awards badges
- Built referral system: unique code, URL capture, share to WhatsApp / native share / copy link, +5% bonus auto-activates after referred user's first successful withdrawal
- Built badges system: First Reel, 100K/500K/1M Views, Top Creator, Referral King
- Built withdrawal flow: request → admin mark paid → wallet credit + auto referral activation
- Added CSV export for admin withdrawals
- Added SEO metadata, OpenGraph, Twitter cards, PWA manifest, sitemap.xml, robots.txt
- Wrote comprehensive README with Firebase production swap instructions and Firestore security rules
- Fixed invalid lucide-react icon imports (UploadCircle→Upload, CheckCircle2→CircleCheck, XCircle→CircleX, Loader2→Loader, Home→House, Code2→Code, HelpCircle→CircleHelp)
- Fixed scoped admin variable bug in /api/admin/submissions PATCH
- Fixed URL normalization bug in duplicate-link detection (trailing-slash variations)
- Verified end-to-end with agent-browser: login → dashboard → submit reel with duplicate detection showing 32,000-25,000=7,000 new views = ₹70 payout → admin approval → wallet credit confirmed → withdrawal request → admin mark paid → all working

Stage Summary:
- Tech: Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + Prisma + Zustand + framer-motion + recharts + next-themes + lucide-react
- Lint: clean (0 errors, 0 warnings)
- 21 view components, 18 API routes, 11 database models
- 20 verification screenshots saved to /home/z/my-project/download/
- Production-ready: swap Prisma → Firestore, mock Google → Firebase Auth, in-browser logo gen → Cloudinary (all documented in README)
- Demo accounts: creator@exbranda.com (Continue with Google button) and admin@exbranda.com (Admin login button)
