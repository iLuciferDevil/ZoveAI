import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "ZoveAI — Where should I go next?",
  description: "AI-powered travel discovery. Tell ZoveAI how you travel — get honest, personalized destination recommendations with routes, costs, and booking links.",
  keywords: "travel planning, AI travel, destination recommendations, trip planner, road trip, India travel",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: '/favicon.png',
  },
  openGraph: {
    title: "ZoveAI — Where should I go next?",
    description: "Not a booking site. Not a search engine. Your AI travel companion that actually knows you.",
    type: "website",
    url: "https://zoveai.com",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
