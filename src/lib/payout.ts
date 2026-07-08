// Payout calculation logic
// Default: 100 INR per 10,000 views
// Formula: payout = (newViews / 10000) * currentRate
// With active referral bonus: currentRate = 100 * 1.05 = 105

import { BASE_RATE_PER_10K, REFERRAL_BONUS_PCT } from "./types";

export function getCurrentRate(referralBonusPct: number): number {
  // e.g. 5% bonus on 100 = 105
  return BASE_RATE_PER_10K * (1 + referralBonusPct / 100);
}

export function calculatePayout(newViews: number, referralBonusPct: number): number {
  const rate = getCurrentRate(referralBonusPct);
  // Support decimals internally, but round display elsewhere
  return (newViews / 10000) * rate;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}
