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
  title: "PredictBag — Agent Prediction Market",
  description: "Predict Virtuals token performance. Mine points. Earn $PREDICTBAG.",
  openGraph: {
    title: "PredictBag",
    description: "Agent-native prediction market on Base",
    url: "https://predictbag.fun",
  },
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
