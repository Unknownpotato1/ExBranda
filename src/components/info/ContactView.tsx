"use client";

import * as React from "react";
import { BackHeader } from "@/components/submissions/SubmitReelView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, MessageCircle, Loader, Send } from "lucide-react";

export function ContactView() {
  const [email, setEmail] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const submit = async () => {
    if (!email.trim() || !subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setSending(true);
    // Mock send — in production, integrate with your support inbox
    await new Promise((r) => setTimeout(r, 800));
    toast.success("Message sent! We'll get back to you within 24 hours.");
    setEmail("");
    setSubject("");
    setMessage("");
    setSending(false);
  };

  return (
    <div className="px-3 pb-4">
      <div className="mx-auto max-w-md space-y-4">
        <BackHeader title="Contact Support" />

        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="text-sm font-semibold">Get in touch</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Have a question, found a bug, or need help with a withdrawal? Send us a message and we'll respond within 24 hours.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5 text-primary" />
            support@exbranda.com
          </div>
        </div>

        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Your Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 rounded-xl text-sm"
              type="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="How can we help?"
              className="h-11 rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue…"
              className="rounded-xl text-sm min-h-[120px] resize-none"
              maxLength={1000}
            />
          </div>
          <Button onClick={submit} disabled={sending} className="w-full h-11 rounded-xl">
            {sending ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
            Send message
          </Button>
        </div>

        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">WhatsApp Support</div>
            <div className="text-xs text-muted-foreground mt-0.5">For urgent issues only</div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => window.open("https://wa.me/919999999999", "_blank")}
          >
            Open
          </Button>
        </div>
      </div>
    </div>
  );
}
