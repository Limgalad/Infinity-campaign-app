import type { Metadata, Viewport } from "next";
import { Orbitron, Exo_2, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

const exo2 = Exo_2({
  subsets: ["latin"],
  variable: "--font-exo2",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#060a13",
};

export const metadata: Metadata = {
  title: "Infinity Campaign Tracker",
  description: "Campaign narrative progress tracker for Infinity the Game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${exo2.variable} ${jetbrainsMono.variable}`}>
      <body className="font-[family-name:var(--font-exo2)] bg-void text-text-primary antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
