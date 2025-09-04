import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from '@/i18n/I18nProvider';
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const isProd = process.env.NODE_ENV === 'production';
const defaultTitle = "Apex Legends Strafe Aiming Tool";
const defaultDescription = "Master strafe aiming techniques in Apex Legends with audio cues and perfect timing. Learn weapon-specific patterns for the firing range.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: "%s | Apex Legends Strafe Aiming Tool",
  },
  description: defaultDescription,
  keywords: [
    "apex legends",
    "strafe aiming",
    "strafe control",
    "recoil control",
    "firing range",
    "gaming",
    "fps",
  ],
  authors: [{ name: "Apex Legends Strafe Aiming Tool" }],
  alternates: {
    canonical: '/',
    languages: {
      'en': '/',
      'ja': '/?lang=ja',
      'ko': '/?lang=ko',
      'zh': '/?lang=zh',
      'x-default': '/',
    },
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: defaultTitle,
    title: defaultTitle,
    description: defaultDescription,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: defaultTitle,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
    images: ['/opengraph-image'],
  },
  icons: {
    icon: '/favicon.ico',
  },
  robots: {
    index: isProd,
    follow: isProd,
    googleBot: {
      index: isProd,
      follow: isProd,
    },
  },
  themeColor: '#111827',
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Analytics/>
      <body className={inter.className}>
        <I18nProvider>
          {children}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebApplication',
                name: defaultTitle,
                url: siteUrl,
                applicationCategory: 'UtilitiesApplication',
                operatingSystem: 'Web',
                description: defaultDescription,
              }),
            }}
          />
        </I18nProvider>
      </body>
    </html>
  );
}
