import type { Metadata } from "next";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.readarcana.com"),
  title: {
    default: "Arcana - AI Tarot Readings | Free Personalized Tarot",
    template: "%s | Arcana",
  },
  description:
    "Discover your path with AI-powered tarot readings. Get personalized interpretations of the classic Rider-Waite deck. 3 free readings when you sign up.",
  keywords: [
    "tarot",
    "tarot reading",
    "ai tarot",
    "free tarot",
    "tarot cards",
    "divination",
    "fortune telling",
    "lectura de tarot",
    "tarot gratis",
  ],
  authors: [{ name: "Arcana" }],
  creator: "Arcana",
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: "es_MX",
    url: "https://www.readarcana.com",
    siteName: "Arcana",
    title: "Arcana - AI Tarot Readings",
    description: "Discover your path with AI-powered tarot readings.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Arcana Tarot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arcana - AI Tarot Readings",
    description: "Discover your path with AI-powered tarot readings.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon-192.png", type: "image/png", sizes: "192x192" }],
  },
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        {/* Plausible Analytics - Privacy-friendly */}
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <Script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
