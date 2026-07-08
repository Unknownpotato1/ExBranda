// Seed script — run once to bootstrap admin user and demo content
// Usage: bun run scripts/seed.ts

import { db } from "../src/lib/db";
import { generateUniqueReferralCode } from "../src/lib/auth";

async function seed() {
  console.log("Seeding ExBranda database...");

  // 1. Admin user
  const adminEmail = "admin@exbranda.com";
  let admin = await db.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const code = await generateUniqueReferralCode("ADMIN");
    admin = await db.user.create({
      data: {
        email: adminEmail,
        name: "ExBranda Admin",
        fullName: "ExBranda Admin",
        referralCode: code,
        role: "admin",
      },
    });
    await db.wallet.create({ data: { userId: admin.id } });
    await db.admin.create({ data: { userId: admin.id } });
    console.log("✓ Admin created:", adminEmail);
  } else {
    console.log("✓ Admin already exists");
  }

  // 2. Demo creator user
  const creatorEmail = "creator@exbranda.com";
  let creator = await db.user.findUnique({ where: { email: creatorEmail } });
  if (!creator) {
    const code = await generateUniqueReferralCode("ARAVS");
    creator = await db.user.create({
      data: {
        email: creatorEmail,
        name: "Aarav Sharma",
        fullName: "Aarav Sharma",
        instagramHandle: "@aarav.creates",
        country: "India",
        upiId: "aarav@okaxis",
        referralCode: code,
      },
    });
    await db.wallet.create({
      data: {
        userId: creator.id,
        balance: 1250.50,
        pendingBalance: 350.00,
        lifetimeEarnings: 2600.75,
        withdrawnTotal: 1350.25,
        todayEarnings: 75.00,
      },
    });
    console.log("✓ Demo creator created:", creatorEmail);
  } else {
    console.log("✓ Demo creator already exists");
  }

  // 3. Demo submissions for the creator
  const existingSubs = await db.submission.count({ where: { userId: creator.id } });
  if (existingSubs === 0) {
    await db.submission.createMany({
      data: [
        {
          userId: creator.id,
          reelUrl: "https://www.instagram.com/reel/CxYz123abc/",
          currentViews: 25000,
          previousApprovedViews: 0,
          newViews: 25000,
          approvedViews: 25000,
          payoutAmount: 250,
          ratePer10k: 100,
          status: "approved",
          approvedAt: new Date(Date.now() - 86400000 * 3),
          approvedBy: admin.id,
        },
        {
          userId: creator.id,
          reelUrl: "https://www.instagram.com/reel/CxYz456def/",
          currentViews: 18000,
          previousApprovedViews: 0,
          newViews: 18000,
          payoutAmount: 0,
          ratePer10k: 100,
          status: "pending",
        },
        {
          userId: creator.id,
          reelUrl: "https://www.instagram.com/reel/CxYz789ghi/",
          currentViews: 5000,
          previousApprovedViews: 0,
          newViews: 5000,
          payoutAmount: 0,
          ratePer10k: 100,
          status: "rejected",
          rejectionReason: "Logo not visible in reel",
        },
      ],
    });
    console.log("✓ Demo submissions created");
  }

  // 4. Transactions for creator
  const existingTx = await db.transaction.count({ where: { userId: creator.id } });
  if (existingTx === 0) {
    await db.transaction.createMany({
      data: [
        {
          userId: creator.id,
          type: "earning",
          amount: 250,
          status: "completed",
          description: "Reel approved — 25,000 new views",
          reelUrl: "https://www.instagram.com/reel/CxYz123abc/",
          views: 25000,
        },
        {
          userId: creator.id,
          type: "withdrawal",
          amount: -1350.25,
          status: "completed",
          description: "Withdrawal to UPI aarav@okaxis",
        },
      ],
    });
    console.log("✓ Demo transactions created");
  }

  // 5. Default settings
  const existingSettings = await db.setting.count();
  if (existingSettings === 0) {
    await db.setting.createMany({
      data: [
        { key: "referral_bonus_type", value: "rate_5pct" },
        { key: "referral_bonus_value", value: "0" },
        { key: "base_rate_per_10k", value: "100" },
        { key: "min_withdrawal", value: "500" },
        { key: "announcement", value: "Welcome to ExBranda! Earn ₹100 for every 10,000 views." },
        { key: "maintenance_mode", value: "false" },
      ],
    });
    console.log("✓ Default settings created");
  }

  console.log("\n✅ Seed complete.");
  console.log("Admin login: admin@exbranda.com (use Admin button on login screen)");
  console.log("Creator login: creator@exbranda.com (use Demo Creator button)");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
