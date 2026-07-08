import { NextResponse } from "next/server";
import { db } from "@/lib/firestore";

// GET /api/settings — public settings (announcement, base rate, etc.)
export async function GET() {
  const settings = await db.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return NextResponse.json({ settings: map });
}
