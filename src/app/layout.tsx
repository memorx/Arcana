import type { Metadata, Viewport } from "next";
import { Gloock, Martian_Mono, Newsreader, Water_Brush } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Providers } from "@/components/providers";
import "./globals.css";

// «Dos tintas» (§5.7): autohospedadas por next/font. Las variables las leen
// los tokens --font-titulo/lectura/dato/pincel de globals.css (@theme inline).
const gloock = Gloock({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--fuente-gloock",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--fuente-newsreader",
});

const martianMono = Martian_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--fuente-martian",
});

// Sólo para la palabra a pincel; sin fallback ajustado (su métrica no se parece a ninguna).
const waterBrush = Water_Brush({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
  variable: "--fuente-water-brush",
});

const fuentes = [gloock, newsreader, martianMono, waterBrush].map((f) => f.variable).join(" ");

export const viewport: Viewport = {
  themeColor: "#0E0D0C",
  colorScheme: "light",
};

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
  const t = await getTranslations("common");

  return (
    <html lang={locale} className={fuentes}>
      <head>
        {/* PWA Meta Tags for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Arcana" />
        <link rel="apple-touch-icon" href="/icon-192.png" />

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
        {/* Skip link: rosa-luz con letra tinta (5.51:1), en mono como los botones */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-full focus:bg-rosa-luz focus:px-5 focus:font-dato focus:text-xs focus:uppercase focus:tracking-[0.1em] focus:text-tinta"
        >
          {t("skipToContent")}
        </a>

        {/* Pincel seco: vetas horizontales que comen el trazo, como brocha con poca tinta.
            Lo usa <Pincel> (y la utilidad `pincel-seco`) con filter: url(#pincel-seco). */}
        <svg
          width="0"
          height="0"
          aria-hidden="true"
          focusable="false"
          style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
        >
          <filter id="pincel-seco" x="-5%" y="-10%" width="110%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.42" numOctaves={2} seed={11} result="vetas" />
            <feColorMatrix
              in="vetas"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.2 2.25"
              result="huecos"
            />
            <feComposite in="SourceGraphic" in2="huecos" operator="in" result="seco" />
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={1} seed={4} result="grano" />
            <feDisplacementMap in="seco" in2="grano" scale={5} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>

        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
