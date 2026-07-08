import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/firestore";
import { z } from "zod";

const schema = z.object({
  upiId: z.string().min(3).optional(),
  instagramHandle: z.string().min(2).optional(),
  country: z.string().min(2).optional(),
  privacyHideWallet: z.boolean().optional(),
  photoURL: z.string().url().optional().or(z.literal("")),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const data: any = {};
    if (parsed.data.upiId) data.upiId = parsed.data.upiId;
    if (parsed.data.instagramHandle) {
      data.instagramHandle = parsed.data.instagramHandle.startsWith("@")
        ? parsed.data.instagramHandle
        : `@${parsed.data.instagramHandle}`;
    }
    if (parsed.data.country) data.country = parsed.data.country;
    if (typeof parsed.data.privacyHideWallet === "boolean")
      data.privacyHideWallet = parsed.data.privacyHideWallet;
    // photoURL — empty string clears it, valid URL sets it
    if (parsed.data.photoURL !== undefined) {
      data.photoURL = parsed.data.photoURL || null;
    }

    const updated = await db.user.update({ where: { id: user.id }, data });
    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
