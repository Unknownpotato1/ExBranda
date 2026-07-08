import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ExBranda — Earn by Promoting Brands",
  description:
    "ExBranda lets Instagram creators earn money by promoting our logo in their Reels. Get paid ₹100 for every 10,000 views. Withdraw instantly via UPI.",
  keywords: [
    "ExBranda",
    "Instagram Reels",
    "creator earnings",
    "influencer marketing",
    "brand promotion",
    "UPI withdrawal",
    "creator monetization",
    "India creators",
  ],
  authors: [{ name: "ExBranda" }],
  applicationName: "ExBranda",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icon.svg" }],
  },
  openGraph: {
    title: "ExBranda — Earn by Promoting Brands",
    description:
      "Turn your Instagram Reels into real income. Earn ₹100 per 10,000 views, withdraw via UPI.",
    url: "https://exbranda.com",
    siteName: "ExBranda",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "ExBranda — Earn by Promoting Brands",
    description:
      "Turn your Instagram Reels into real income. Earn ₹100 per 10,000 views, withdraw via UPI.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0e1a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          {children}
          <Toaster />
          <SonnerToaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
