import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/firestore";
import { z } from "zod";

const schema = z.object({
  text: z.string().min(1, "Message cannot be empty").max(5000).optional(),
  imageUrl: z.string().url().optional(),
});

// GET /api/chat/messages — returns the current user's conversation with admin
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messages = await db.message.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  return NextResponse.json({ messages });
}

// POST /api/chat/messages — user sends a message to admin
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const { text, imageUrl } = parsed.data;
    if (!text && !imageUrl) {
      return NextResponse.json({ error: "Message or image required" }, { status: 400 });
    }

    const message = await db.message.create({
      data: {
        userId: user.id,
        userName: user.fullName || user.name || "User",
        userEmail: user.email,
        sender: "user",
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
