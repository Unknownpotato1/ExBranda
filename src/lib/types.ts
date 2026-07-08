// Shared types for ExBranda
// These mirror the Prisma models but are safe to use on the client.

export type Role = "user" | "admin";

export type SubmissionStatus = "pending" | "approved" | "rejected";
export type WithdrawalStatus = "pending" | "approved" | "rejected" | "paid";
export type TransactionType =
  | "earning"
  | "withdrawal"
  | "referral_bonus"
  | "adjustment";
export type NotificationType =
  | "submission_approved"
  | "submission_rejected"
  | "withdrawal_approved"
  | "withdrawal_paid"
  | "referral_activated"
  | "bonus_increased"
  | "broadcast";

export interface UserDTO {
  id: string;
  email: string;
  name: string | null;
  fullName: string | null;
  instagramHandle: string | null;
  country: string | null;
  upiId: string | null;
  referralCode: string;
  referredBy: string | null;
  referralActive: boolean;
  referralBonusPct: number;
  role: Role;
  banned: boolean;
  privacyHideWallet: boolean;
  badges: string[];
  createdAt: string;
}

export interface WalletDTO {
  balance: number;
  pendingBalance: number;
  lifetimeEarnings: number;
  withdrawnTotal: number;
  todayEarnings: number;
}

export interface SubmissionDTO {
  id: string;
  userId: string;
  reelUrl: string;
  currentViews: number;
  previousApprovedViews: number;
  newViews: number;
  approvedViews: number;
  rejectedViews: number;
  payoutAmount: number;
  ratePer10k: number;
  status: SubmissionStatus;
  notes: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  // joined
  userName?: string;
  userInstagram?: string;
}

export interface WithdrawalDTO {
  id: string;
  userId: string;
  amount: number;
  upiId: string;
  status: WithdrawalStatus;
  rejectedReason: string | null;
  paidAt: string | null;
  createdAt: string;
  userName?: string;
}

export interface TransactionDTO {
  id: string;
  type: TransactionType;
  amount: number;
  status: string;
  description: string;
  reelUrl: string | null;
  views: number | null;
  createdAt: string;
}

export interface NotificationDTO {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  todayNewUsers: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  todayWithdrawals: number;
  pendingWithdrawals: number;
  totalPaid: number;
  totalDownloads: number;
  topEarners: { id: string; name: string; instagram: string; earnings: number }[];
  topReferrers: { id: string; name: string; instagram: string; referrals: number }[];
  // chart data
  submissionsTrend: { date: string; count: number }[];
  payoutsTrend: { date: string; amount: number }[];
}

export const BASE_RATE_PER_10K = 100; // ₹100 per 10,000 views
export const REFERRAL_BONUS_PCT = 5; // +5% rate
export const MIN_WITHDRAWAL = 500; // ₹500
