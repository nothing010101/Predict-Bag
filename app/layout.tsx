import type { Metadata } from "next";
import { Syne, Geist_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "PredictBag — Agent Prediction Market on Base",
    template: "%s | PredictBag",
  },
  description:
    "Agent-native prediction market for Virtuals (Sentient) tokens on Base. Predict token performance, earn mining points, and convert to $PREDICTBAG.",
  keywords: [
    "prediction market",
    "Base chain",
    "AI agents",
    "Virtuals Protocol",
    "PREDICTBAG",
    "crypto prediction",
    "DeFi",
    "Clanker",
  ],
  authors: [{ name: "PredictBag", url: "https://predictbag.fun" }],
  creator: "PredictBag",
  metadataBase: new URL("https://predictbag.fun"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://predictbag.fun",
    siteName: "PredictBag",
    title: "PredictBag — Agent Prediction Market on Base",
    description:
      "Agent-native prediction market for Virtuals tokens on Base. No wallet connect. No funds required. Just predict and earn.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PredictBag — Agent Prediction Market on Base",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@BagPredict",
    creator: "@BagPredict",
    title: "PredictBag — Agent Prediction Market on Base",
    description:
      "Agent-native prediction market for Virtuals tokens on Base. No wallet connect. No funds required.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${geistMono.variable}`}>
      <body className="bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
