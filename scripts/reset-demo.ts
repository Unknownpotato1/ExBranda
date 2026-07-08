// Reset the demo creator's submissions and wallet to a clean state
import { db } from "../src/lib/db";

async function reset() {
  // Delete all submissions/transactions for creator (except keep nothing)
  const creator = await db.user.findUnique({ where: { email: "creator@exbranda.com" } });
  if (!creator) {
    console.log("Creator not found");
    return;
  }
  await db.submission.deleteMany({ where: { userId: creator.id } });
  await db.transaction.deleteMany({ where: { userId: creator.id } });
  await db.notification.deleteMany({ where: { userId: creator.id } });

  // Re-create the original 3 demo submissions
  const admin = await db.user.findUnique({ where: { email: "admin@exbranda.com" } });
  await db.submission.createMany({
    data: [
      {
        userId: creator.id,
        reelUrl: "https://www.instagram.com/reel/CxYz123abc",
        currentViews: 25000,
        previousApprovedViews: 0,
        newViews: 25000,
        approvedViews: 25000,
        payoutAmount: 250,
        ratePer10k: 100,
        status: "approved",
        approvedAt: new Date(Date.now() - 86400000 * 3),
        approvedBy: admin?.id || "",
      },
      {
        userId: creator.id,
        reelUrl: "https://www.instagram.com/reel/CxYz456def",
        currentViews: 18000,
        previousApprovedViews: 0,
        newViews: 18000,
        payoutAmount: 180,
        ratePer10k: 100,
        status: "pending",
      },
      {
        userId: creator.id,
        reelUrl: "https://www.instagram.com/reel/CxYz789ghi",
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

  // Re-create transactions
  await db.transaction.createMany({
    data: [
      {
        userId: creator.id,
        type: "earning",
        amount: 250,
        status: "completed",
        description: "Reel approved — 25,000 new views",
        reelUrl: "https://www.instagram.com/reel/CxYz123abc",
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

  // Reset wallet
  await db.wallet.update({
    where: { userId: creator.id },
    data: {
      balance: 1250.50,
      pendingBalance: 180.00, // matches the pending submission
      lifetimeEarnings: 2600.75,
      withdrawnTotal: 1350.25,
      todayEarnings: 0,
    },
  });

  console.log("✓ Reset complete");
}

reset()
  .catch(console.error)
  .finally(() => db.$disconnect());
