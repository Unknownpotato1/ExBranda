// Cloudinary client — server-side only
// Used for serving logo assets and (optionally) uploading user-generated content.

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "drlmgjt6p";
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const BASE = `https://res.cloudinary.com/${CLOUD_NAME}`;

// The ExBranda logo asset (hosted on Cloudinary)
export const LOGO_URL = `${BASE}/video/upload/v1783516278/Screenrecorder-2026-07-08-18-07-20-5251_s5cpny.mp4`;

// Legacy asset map (kept for backward compat with /api/downloads/asset)
export const LOGO_ASSETS = {
  png: LOGO_URL,
  transparent_png: LOGO_URL,
  svg: LOGO_URL,
  zip: LOGO_URL,
} as const;

export type LogoAssetType = keyof typeof LOGO_ASSETS;

// Check if Cloudinary credentials are configured (server-side)
export function isCloudinaryConfigured(): boolean {
  return !!(CLOUD_NAME && API_KEY && API_SECRET);
}

// Generate a signed upload signature (server-only, never expose API secret to client)
export async function generateUploadSignature(folder: string): Promise<{
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
} | null> {
  if (!isCloudinaryConfigured()) return null;
  const crypto = await import("crypto");
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(paramsToSign + API_SECRET)
    .digest("hex");
  return {
    signature,
    timestamp,
    apiKey: API_KEY!,
    cloudName: CLOUD_NAME,
    folder,
  };
}
