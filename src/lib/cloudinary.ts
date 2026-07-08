// Cloudinary client — server-side only
// Used for serving logo assets and (optionally) uploading user-generated content.
// In production, logos are stored as versioned Cloudinary URLs.

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "drlmgjt6p";
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const BASE = `https://res.cloudinary.com/${CLOUD_NAME}`;

// Public logo asset URLs (upload these to Cloudinary once — see README)
// Until uploaded, the app falls back to client-side generated logos.
export const LOGO_ASSETS = {
  png: `${BASE}/image/upload/v1/exbranda/logo.png`,
  transparent_png: `${BASE}/image/upload/v1/exbranda/logo-transparent.png`,
  svg: `${BASE}/image/upload/v1/exbranda/logo.svg`,
  zip: `${BASE}/image/upload/v1/exbranda/brand-kit.zip`,
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
