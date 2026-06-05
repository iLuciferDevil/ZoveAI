import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZoveAI — Where should I go next?",
  description: "AI-powered travel discovery. Tell ZoveAI who you are and how you travel — get honest, personalized destination recommendations that actually fit your life.",
  keywords: "travel planning, AI travel, destination recommendations, trip planner, travel guide",
  openGraph: {
    title: "ZoveAI — Where should I go next?",
    description: "Not a booking site. Not a search engine. Your AI travel companion that actually knows you.",
    type: "website",
    url: "https://zoveai.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZoveAI — Where should I go next?",
    description: "AI that helps you discover where to go next, based on who you are.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
