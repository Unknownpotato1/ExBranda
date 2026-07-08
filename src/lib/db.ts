// ExBranda database client with auto-schema-init for ephemeral filesystems (Vercel)
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  __prismaReady?: boolean;
  __prismaInitPromise?: Promise<void> | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error", "warn"] : ["query", "error", "warn"],
  });

if (!globalForPrisma.prisma) globalForPrisma.prisma = db;
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// On serverless platforms (Vercel), the SQLite file in /tmp is ephemeral.
// This function ensures the schema exists before any query runs.
// Idempotent — safe to call on every request.
export async function readyDb(): Promise<PrismaClient> {
  if (globalForPrisma.__prismaReady) return db;
  if (globalForPrisma.__prismaInitPromise) {
    await globalForPrisma.__prismaInitPromise;
    return db;
  }
  globalForPrisma.__prismaInitPromise = initSchema(db);
  await globalForPrisma.__prismaInitPromise;
  return db;
}

async function initSchema(client: PrismaClient): Promise<void> {
  try {
    // Probe — if User table exists & is queryable, we're done
    await client.$queryRaw`SELECT COUNT(*) as c FROM User LIMIT 1`;
    globalForPrisma.__prismaReady = true;
    return;
  } catch {
    // Fall through to schema creation
  }

  try {
    await client.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "name" TEXT, "fullName" TEXT, "instagramHandle" TEXT, "country" TEXT, "upiId" TEXT,
      "referralCode" TEXT NOT NULL, "referredBy" TEXT,
      "referralActive" BOOLEAN NOT NULL DEFAULT 0, "referralBonusPct" REAL NOT NULL DEFAULT 0,
      "role" TEXT NOT NULL DEFAULT 'user', "banned" BOOLEAN NOT NULL DEFAULT 0,
      "privacyHideWallet" BOOLEAN NOT NULL DEFAULT 0, "badges" TEXT NOT NULL DEFAULT '[]',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "User_email_key" UNIQUE ("email"),
      CONSTRAINT "User_referralCode_key" UNIQUE ("referralCode"));`);

    await client.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Wallet" (
      "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL,
      "balance" REAL NOT NULL DEFAULT 0, "pendingBalance" REAL NOT NULL DEFAULT 0,
      "lifetimeEarnings" REAL NOT NULL DEFAULT 0, "withdrawnTotal" REAL NOT NULL DEFAULT 0,
      "todayEarnings" REAL NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Wallet_userId_key" UNIQUE ("userId"),
      CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE);`);

    await client.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Transaction" (
      "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL,
      "type" TEXT NOT NULL, "amount" REAL NOT NULL, "status" TEXT NOT NULL DEFAULT 'completed',
      "description" TEXT NOT NULL, "reelUrl" TEXT, "views" INTEGER, "submissionId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE);`);

    await client.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Submission" (
      "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "reelUrl" TEXT NOT NULL,
      "currentViews" INTEGER NOT NULL, "previousApprovedViews" INTEGER NOT NULL DEFAULT 0,
      "newViews" INTEGER NOT NULL DEFAULT 0, "approvedViews" INTEGER NOT NULL DEFAULT 0,
      "rejectedViews" INTEGER NOT NULL DEFAULT 0, "payoutAmount" REAL NOT NULL DEFAULT 0,
      "ratePer10k" REAL NOT NULL DEFAULT 100, "status" TEXT NOT NULL DEFAULT 'pending',
      "notes" TEXT, "rejectionReason" TEXT, "approvedAt" DATETIME, "approvedBy" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE);`);
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Submission_userId_reelUrl_idx" ON "Submission"("userId","reelUrl");`);
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Submission_status_idx" ON "Submission"("status");`);

    await client.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Withdrawal" (
      "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "amount" REAL NOT NULL,
      "upiId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending',
      "rejectedReason" TEXT, "paidAt" DATETIME, "paidBy" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE);`);
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Withdrawal_status_idx" ON "Withdrawal"("status");`);

    await client.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Referral" (
      "id" TEXT NOT NULL PRIMARY KEY, "referrerId" TEXT NOT NULL, "referredId" TEXT NOT NULL,
      "code" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending', "activatedAt" DATETIME,
      "bonusType" TEXT NOT NULL DEFAULT 'rate_5pct', "bonusValue" REAL NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE,
      CONSTRAINT "Referral_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "User"("id") ON DELETE CASCADE,
      CONSTRAINT "Referral_referredId_key" UNIQUE ("referredId"));`);

    await client.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Setting" (
      "id" TEXT NOT NULL PRIMARY KEY, "key" TEXT NOT NULL, "value" TEXT NOT NULL,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Setting_key_key" UNIQUE ("key"));`);

    await client.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Admin" (
      "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Admin_userId_key" UNIQUE ("userId"),
      CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE);`);

    await client.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Notification" (
      "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "title" TEXT NOT NULL,
      "message" TEXT NOT NULL, "type" TEXT NOT NULL, "read" BOOLEAN NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE);`);
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId","read");`);

    await client.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Download" (
      "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "fileType" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Download_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE);`);

    await client.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT NOT NULL PRIMARY KEY, "actorId" TEXT, "action" TEXT NOT NULL,
      "target" TEXT, "meta" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id"));`);

    // Seed admin user + default settings on first init
    const adminEmail = "admin@exbranda.com";
    const existingAdmin = await client.user.findUnique({ where: { email: adminEmail } });
    if (!existingAdmin) {
      const admin = await client.user.create({
        data: {
          email: adminEmail,
          name: "ExBranda Admin",
          fullName: "ExBranda Admin",
          referralCode: "ADMIN" + Math.floor(Math.random() * 9000 + 1000),
          role: "admin",
        },
      });
      await client.wallet.create({ data: { userId: admin.id } });
      await client.admin.create({ data: { userId: admin.id } });
    }

    if ((await client.setting.count()) === 0) {
      await client.setting.createMany({
        data: [
          { key: "referral_bonus_type", value: "rate_5pct" },
          { key: "referral_bonus_value", value: "0" },
          { key: "base_rate_per_10k", value: "100" },
          { key: "min_withdrawal", value: "500" },
          { key: "announcement", value: "Welcome to ExBranda! Earn ₹100 for every 10,000 views." },
          { key: "maintenance_mode", value: "false" },
        ],
      });
    }

    globalForPrisma.__prismaReady = true;
  } catch (e) {
    console.error("[db] schema init failed:", e);
    globalForPrisma.__prismaInitPromise = undefined;
    throw e;
  }
}
