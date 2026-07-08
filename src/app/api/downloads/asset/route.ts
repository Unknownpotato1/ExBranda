import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/firestore";
import { LOGO_ASSETS, LogoAssetType } from "@/lib/cloudinary";

const VALID_TYPES: LogoAssetType[] = ["png", "transparent_png", "svg", "zip"];

// GET /api/downloads/asset?type=png
// Proxies the Cloudinary-hosted logo asset and logs the download.
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as LogoAssetType | null;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid asset type" }, { status: 400 });
  }

  // Log the download
  await db.download.create({ data: { userId: user.id, fileType: type } });

  const assetUrl = LOGO_ASSETS[type];
  // Redirect to Cloudinary URL — they handle the actual file serving
  return NextResponse.redirect(assetUrl, { status: 302 });
}
