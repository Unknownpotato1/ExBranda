import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/firestore";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import crypto from "crypto";

// POST /api/chat/upload
// Body: { image: "<base64 data URL>" }
// Uploads to Cloudinary and returns the URL.
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { image } = body as { image?: string };
    if (!image || !image.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
    }
    if (image.length > 2_700_000) {
      return NextResponse.json({ error: "Image too large (max 2MB)" }, { status: 400 });
    }

    let imageUrl: string;

    if (isCloudinaryConfigured()) {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
      const apiKey = process.env.CLOUDINARY_API_KEY!;
      const apiSecret = process.env.CLOUDINARY_API_SECRET!;

      const timestamp = Math.floor(Date.now() / 1000);
      const folder = `exbranda/chat/${user.id}`;
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
          { error: uploadJson.error?.message || "Upload failed" },
          { status: 500 }
        );
      }
      imageUrl = uploadJson.secure_url;
    } else {
      imageUrl = image;
    }

    return NextResponse.json({ imageUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}
