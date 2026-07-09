import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/firestore";
import { z } from "zod";

// GET /api/admin/chat — returns all conversations grouped by user
export async function GET(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (userId) {
    // Return messages for a specific conversation
    const messages = await db.message.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 500,
    });
    // Mark admin-directed messages as read
    await db.message.updateMany({
      where: { userId, sender: "user", read: false },
      data: { read: true },
    });
    return NextResponse.json({ messages });
  }

  // Return all conversations (latest message per user)
  const allMessages = await db.message.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  // Group by userId, get latest message + unread count per user
  const convos = new Map<string, {
    userId: string;
    userName: string;
    userEmail: string;
    lastMessage: string;
    lastImageUrl: string | null;
    lastSender: string;
    lastAt: any;
    unreadCount: number;
  }>();

  for (const m of allMessages) {
    const existing = convos.get(m.userId);
    if (!existing) {
      convos.set(m.userId, {
        userId: m.userId,
        userName: m.userName || "User",
        userEmail: m.userEmail || "",
        lastMessage: m.text || (m.imageUrl ? "📷 Image" : ""),
        lastImageUrl: m.imageUrl || null,
        lastSender: m.sender,
        lastAt: m.createdAt,
        unreadCount: m.sender === "user" && !m.read ? 1 : 0,
      });
    } else {
      if (m.sender === "user" && !m.read) existing.unreadCount++;
    }
  }

  return NextResponse.json({
    conversations: Array.from(convos.values()),
  });
}

// POST /api/admin/chat — admin replies to a user
const replySchema = z.object({
  userId: z.string().min(1),
  text: z.string().min(1).max(5000).optional(),
  imageUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { userId, text, imageUrl } = parsed.data;
    if (!text && !imageUrl) {
      return NextResponse.json({ error: "Message or image required" }, { status: 400 });
    }

    // Get user info
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const message = await db.message.create({
      data: {
        userId,
        userName: user.fullName || user.name || "User",
        userEmail: user.email,
        sender: "admin",
        text: text || null,
        imageUrl: imageUrl || null,
        read: false,
      },
    });

    return NextResponse.json({ message });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
