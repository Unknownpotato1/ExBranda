import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/firestore";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import crypto from "crypto";

// POST /api/user/upload-photo
// Body: { image: "<base64 data URL>" }
// Uploads the image to Cloudinary and returns the secure URL.
// Falls back to storing the base64 data URL directly in Firestore if
// Cloudinary isn't configured (NOT recommended for production — images
// can be large and Firestore has a 1MB document limit).
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { image } = body as { image?: string };
    if (!image || !image.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
    }

    // Limit to ~2MB base64 (~1.5MB actual)
    if (image.length > 2_700_000) {
      return NextResponse.json({ error: "Image too large (max 2MB)" }, { status: 400 });
    }

    let photoURL: string;

    if (isCloudinaryConfigured()) {
      // Upload to Cloudinary using unsigned upload (we sign with API secret server-side)
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
      const apiKey = process.env.CLOUDINARY_API_KEY!;
      const apiSecret = process.env.CLOUDINARY_API_SECRET!;

      const timestamp = Math.floor(Date.now() / 1000);
      const folder = `exbranda/avatars/${user.id}`;
      const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
      const signature = crypto
        .createHash("sha1")
        .update(paramsToSign + apiSecret)
        .digest("hex");

      const formData = new FormData();
      formData.append("file", image);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("folder", folder);
      formData.append("signature", signature);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.secure_url) {
        return NextResponse.json(
          { error: uploadJson.error?.message || "Cloudinary upload failed" },
          { status: 500 }
        );
      }
      photoURL = uploadJson.secure_url;
    } else {
      // Fallback: store data URL directly (not recommended for production)
      photoURL = image;
    }

    // Save to user document
    await db.user.update({ where: { id: user.id }, data: { photoURL } });

    return NextResponse.json({ photoURL });
  } catch (e: any) {
    console.error("[upload-photo] error:", e);
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}
