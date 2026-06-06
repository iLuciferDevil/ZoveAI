import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "ZoveAI — Where should I go next?",
  description: "AI-powered travel discovery. Tell ZoveAI how you travel — get honest, personalized destination recommendations with routes, costs, risk assessments and booking links.",
  keywords: "travel planning, AI travel recommendations, destination finder, trip planner, road trip India, travel companion AI",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: '/favicon.png',
  },
  openGraph: {
    title: "ZoveAI — Where should I go next?",
    description: "Not a booking site. An AI that knows you and gives honest travel recommendations.",
    type: "website",
    url: "https://zoveai.com",
    siteName: "ZoveAI",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZoveAI — Where should I go next?",
    description: "AI-powered travel discovery. Honest recommendations, risk assessments, and pre-filled booking links.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: "https://zoveai.com",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#0D0F0E" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
