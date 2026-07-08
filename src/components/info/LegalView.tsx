"use client";

import * as React from "react";
import { BackHeader } from "@/components/submissions/SubmitReelView";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const POLICIES = [
  {
    title: "Privacy Policy",
    content: `ExBranda respects your privacy. We collect only the information needed to operate the service: your email (via Google Sign-In), name, Instagram handle, country, UPI ID, and reel submission data.

We never post to your Instagram account. We do not sell your data to third parties. Your UPI ID is used solely for processing withdrawals. Wallet balances and transaction history are visible only to you and our admin team.

You may request deletion of your account and all associated data at any time by contacting support@exbranda.com. We retain audit logs for 90 days for fraud prevention, then permanently delete them.`,
  },
  {
    title: "Terms & Conditions",
    content: `By using ExBranda, you agree to:

1. Submit only reels you own or have permission to monetize.
2. Display the ExBranda logo visibly in submitted reels.
3. Not artificially inflate view counts using bots, paid services, or any fraudulent means.
4. Not submit the same views twice (our system enforces this).
5. Provide accurate UPI IDs for withdrawals.
6. Not create multiple accounts to abuse the referral system.

Violation of these terms may result in account suspension, forfeiture of pending earnings, and permanent ban from the platform.

ExBranda reserves the right to modify payout rates, referral bonuses, and minimum withdrawal amounts with 7 days' notice via in-app announcement.`,
  },
  {
    title: "Disclaimer",
    content: `ExBranda is a creator monetization platform. We do not guarantee specific earnings — your income depends entirely on the views your reels receive and the admin approval process.

Earnings estimates shown in the app are based on the current pay rate and are not guaranteed. We reserve the right to reject any submission that does not meet our quality or guideline standards.

The ExBranda logo is a trademark of ExBranda. You may use it only in approved promotional reels and must not modify, recolor, or use it for any other purpose.`,
  },
  {
    title: "Community Guidelines",
    content: `To keep ExBranda safe and fair for everyone:

• Do not post reels containing hate speech, nudity, violence, or illegal content.
• Do not engage in view fraud, botting, or coordinated artificial inflation.
• Do not harass other creators or our admin team.
• Do not attempt to exploit bugs or bypass our duplicate-view detection.
• Be respectful in all communications with our team.

Violations may result in immediate account ban and forfeiture of all pending earnings.`,
  },
  {
    title: "Earnings Policy",
    content: `Earnings are calculated as: (new views / 10,000) × current rate.

The default rate is ₹100 per 10,000 views. With an active referral bonus, your rate becomes ₹105 per 10,000 views.

"New views" are defined as: current total views minus previously approved views for the same reel URL. You cannot earn twice for the same views.

All earnings are initially marked as "pending" until an admin approves your submission. Upon approval, earnings move to your available balance instantly.

ExBranda reserves the right to adjust or reverse earnings if fraudulent activity is detected, even after approval.`,
  },
  {
    title: "Refund Policy",
    content: `Because ExBranda pays creators (rather than charging them), traditional refunds do not apply.

If a withdrawal is rejected by our team (e.g., invalid UPI ID), the full amount is refunded to your wallet balance immediately.

If you believe an admin decision (rejection, payout adjustment) was made in error, you may appeal by contacting support@exbranda.com within 7 days of the decision. Appeals are reviewed by a senior admin and decisions are final.`,
  },
];

export function LegalView() {
  return (
    <div className="px-3 pb-4">
      <div className="mx-auto max-w-md space-y-4">
        <BackHeader title="Legal & Policies" />
        <p className="text-xs text-muted-foreground px-1">
          Please read these policies carefully. By using ExBranda, you agree to all of them.
        </p>
        <Accordion type="single" collapsible className="space-y-2">
          {POLICIES.map((p, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="glass rounded-2xl px-4 border-0">
              <AccordionTrigger className="text-sm font-medium py-4 hover:no-underline">
                {p.title}
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-4 whitespace-pre-line">
                {p.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="text-center text-[11px] text-muted-foreground pt-2">
          Last updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>
    </div>
  );
}
