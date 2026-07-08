"use client";

import { BackHeader } from "@/components/submissions/SubmitReelView";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "How do I download the ExBranda logo?",
    a: "Go to the Download Logo page from your dashboard. You can download the logo as PNG, transparent PNG, SVG, or as a complete ZIP brand kit. The transparent PNG is best for overlaying on your videos. Always keep the logo visible for at least 3 seconds in your reel.",
  },
  {
    q: "How do I submit a reel?",
    a: "Tap the Submit Reel button on your dashboard. Paste your Instagram Reel URL, enter the current view count, and confirm the reel contains the ExBranda logo. Your submission goes into pending state until an admin reviews it.",
  },
  {
    q: "How does payment work?",
    a: "You earn ₹100 for every 10,000 new views. When your reel is approved, the money instantly moves from pending to your available wallet balance. With an active referral bonus, your rate becomes ₹105 per 10,000 views.",
  },
  {
    q: "What are 'new views' and why don't I get paid twice?",
    a: "We only pay for views you haven't been paid for before. If you submitted a reel with 15,000 views and were approved, then later submit the same reel with 32,000 views, we calculate the difference (17,000 new views) and only pay for those. You can never earn twice for the same views.",
  },
  {
    q: "What if I enter fewer views than before?",
    a: "You'll see an error. Your current views must always be greater than your previously approved views. This prevents duplicate or erroneous submissions.",
  },
  {
    q: "How long does approval take?",
    a: "Submissions are typically reviewed within 24 hours. Our admin team manually verifies each reel to ensure it contains the logo and follows community guidelines.",
  },
  {
    q: "How do withdrawals work?",
    a: "Go to Withdraw Money from your dashboard. Minimum withdrawal is ₹500. Enter your UPI ID and the amount. Our team manually processes the payment, usually within 24 hours. You'll get a notification when it's paid.",
  },
  {
    q: "How does the referral system work?",
    a: "Share your unique referral code with other creators. When they sign up using your code AND complete their first successful withdrawal, your +5% referral bonus permanently activates. You'll then earn ₹105 per 10,000 views instead of ₹100.",
  },
  {
    q: "Can I refer myself?",
    a: "No. Self-referrals are blocked. Each new user can only be referred once — only the first referral code applied to an account counts.",
  },
  {
    q: "Why was my submission rejected?",
    a: "Common reasons: logo not visible, logo modified or recolored, reel doesn't follow community guidelines, or the views seem artificially inflated. The rejection reason is shown in your submission history.",
  },
];

export function FAQView() {
  return (
    <div className="px-3 pb-4">
      <div className="mx-auto max-w-md space-y-4">
        <BackHeader title="FAQ" />
        <p className="text-xs text-muted-foreground px-1">
          Everything you need to know about earning with ExBranda.
        </p>
        <Accordion type="single" collapsible className="space-y-2">
          {FAQS.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="glass rounded-2xl px-4 border-0"
            >
              <AccordionTrigger className="text-sm font-medium py-4 hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-4">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
