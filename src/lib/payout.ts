// Payout calculation logic
// Default: 100 INR per 10,000 views
// Formula: payout = (newViews / 10000) * currentRate
// With active referral bonus: currentRate = 100 * 1.05 = 105

import { BASE_RATE_PER_10K, REFERRAL_BONUS_PCT } from "./types";

export function getCurrentRate(referralBonusPct: number | undefined | null): number {
  const pct = typeof referralBonusPct === "number" && !isNaN(referralBonusPct) ? referralBonusPct : 0;
  return BASE_RATE_PER_10K * (1 + pct / 100);
}

export function calculatePayout(newViews: number, referralBonusPct: number | undefined | null): number {
  const rate = getCurrentRate(referralBonusPct);
  const views = typeof newViews === "number" && !isNaN(newViews) ? newViews : 0;
  return (views / 10000) * rate;
}

export function formatINR(amount: number | undefined | null): string {
  const n = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatNumber(n: number | undefined | null): string {
  const v = typeof n === "number" && !isNaN(n) ? n : 0;
  return new Intl.NumberFormat("en-IN").format(v);
}

export function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}
