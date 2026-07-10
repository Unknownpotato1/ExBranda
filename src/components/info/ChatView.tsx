"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { BackHeader } from "@/components/submissions/SubmitReelView";
import { toast } from "sonner";
import { Send, Image as ImageIcon, Loader, Headphones } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "admin";
  text: string | null;
  imageUrl: string | null;
  createdAt: string;
  read: boolean;
}

export function ChatView() {
  const user = useAppStore((s) => s.user);
  const [messages, setMessages] = React.useState<Message[] | null>(null);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    try {
      const r = await fetch("/api/chat/messages");
      const j = await r.json();
      setMessages(j.messages || []);
    } catch {
      setMessages([]);
    }
  }, []);

  React.useEffect(() => {
    load();
    // Poll for new messages every 5 seconds
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (e?: React.KeyboardEvent) => {
    if (e && e.key !== "Enter") return;
    if (!text.trim() || sending) return;

    const msgText = text.trim();
    setText("");
    setSending(true);

    // Optimistic insert
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      sender: "user",
      text: msgText,
      imageUrl: null,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...(prev || []), optimistic]);

    try {
      const r = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msgText }),
      });
      if (!r.ok) throw new Error("Failed to send");
      // Reload to get the real message
      await load();
    } catch {
      toast.error("Failed to send message");
      // Remove optimistic message
      setMessages((prev) => (prev || []).filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image too large (max 2MB)");
      return;
    }

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const r = await fetch("/api/chat/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Upload failed");

      // Send message with image
      const r2 = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: j.imageUrl }),
      });
      if (!r2.ok) throw new Error("Failed to send");
      await load();
      toast.success("Image sent");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="px-3 pb-4 flex flex-col" style={{ minHeight: "calc(100vh - 180px)" }}>
      <div className="mx-auto max-w-md w-full flex flex-col flex-1">
        <BackHeader title="Chat with Us" />

        {/* Chat header */}
        <div className="glass rounded-2xl p-3 flex items-center gap-3 mt-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-800 flex items-center justify-center text-white shrink-0">
            <Headphones className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">ExBranda Support</div>
            <div className="text-[11px] text-emerald-500 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Online — typically replies within hours
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto slim-scroll space-y-2 mt-3 mb-3 min-h-[200px]"
        >
          {messages === null ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center mt-4">
              <Headphones className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <div className="text-sm font-medium">No messages yet</div>
              <div className="text-xs text-muted-foreground mt-1">
                Send a message below — we'll reply as soon as possible. You can also share images.
              </div>
            </div>
          ) : (
            messages.map((m, i) => <MessageBubble key={m.id} message={m} />)
          )}
        </div>

        {/* Input area */}
        <div className="glass rounded-2xl p-2.5 flex items-end gap-2 sticky bottom-16">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage || sending}
            className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0 disabled:opacity-50"
            aria-label="Send image"
          >
            {uploadingImage ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <ImageIcon className="h-5 w-5" />
            )}
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none outline-none py-2.5 px-1 max-h-24"
            disabled={sending}
          />
          <button
            onClick={() => send()}
            disabled={!text.trim() || sending}
            className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 hover:brightness-110 transition-all"
            aria-label="Send"
          >
            {sending ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-4.5 w-4.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.sender === "user";
  const time = new Date(message.createdAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-2xl px-3 py-2 ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "glass rounded-bl-md"
          }`}
        >
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt="Shared image"
              className="rounded-lg max-w-full max-h-48 mb-1"
              loading="lazy"
            />
          )}
          {message.text && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
          )}
        </div>
        <div className={`text-[10px] text-muted-foreground mt-0.5 px-1 ${isUser ? "text-right" : "text-left"}`}>
          {time}
          {isUser && (message.read ? " · Read" : " · Sent")}
        </div>
      </div>
    </motion.div>
  );
}
