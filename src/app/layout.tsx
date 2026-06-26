import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ve.crafter.run";
const DESCRIPTION =
  "Plataforma ciudadana, abierta y privada por diseño para mapear cortes de electricidad, agua, escasez de medicinas, alimentos y combustible en Venezuela. Inspirada en Mission 4636.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Misión Venezuela · Mapa ciudadano de servicios",
  description: DESCRIPTION,
  openGraph: {
    title: "Misión Venezuela",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Misión Venezuela",
    locale: "es_VE",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Misión Venezuela",
    description: DESCRIPTION,
    images: ["/og-twitter.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
        <Toaster theme="dark" position="bottom-right" />
        <Analytics />
      </body>
    </html>
  );
}
