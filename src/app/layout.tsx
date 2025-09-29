import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from '@/i18n/I18nProvider';

const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const isProd = process.env.NODE_ENV === 'production';
const defaultTitle = "Apex Legends Recoil Strafe Trainer";
const defaultDescription = "Improve your recoil strafing in Apex Legends with audio cues and visual indicators.";


export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: "%s",
  },
  description: defaultDescription,
  keywords: [
    "apex legends",
    "apex legends recoil control",
    "strafe aiming",
    "strafe control",
    "recoil control",
    "firing range",
    "gaming",
    "fps",
  ],
  authors: [{ name: "RaVen_ShP" }],
  alternates: {
    canonical: '/',
    languages: {
      'en': '/',
      'ja': '/ja',
      'ko': '/ko',
      'zh': '/zh',
      'ru': '/ru',
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
        url: '/opengraph-image.png',
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
    images: ['/twitter-image.png'],
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
    <html lang="en" className="bg-gray-900 text-white" style={{ colorScheme: 'dark' }}>
      <head>
        {isProd && (
          <script defer src="/um.js" data-website-id="b87caea7-b860-43f7-aef8-14970c007d40"></script>
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try {
              var w = window;
              var path = w.location.pathname;
              if (path !== '/') return; // only act on homepage
              var supported = ['en','ja','ko','zh','ru'];
              var segments = path.split('/').filter(Boolean);
              var params = new URLSearchParams(w.location.search);
              var qp = params.get('lang');
              var stored = null;
              try { stored = w.localStorage.getItem('preferred_locale'); } catch (e) {}
              var ua = navigator.userAgent || '';
              var isBot = /(bot|crawler|spider|crawling|facebookexternalhit|slackbot)/i.test(ua);
              if (isBot) return;
              var normalize = function(v){ if(!v) return null; v = String(v).toLowerCase();
                if (v.startsWith('ja')) return 'ja';
                if (v.startsWith('ko')) return 'ko';
                if (v.startsWith('zh')) return 'zh';
                if (v.startsWith('ru')) return 'ru';
                if (v.startsWith('en')) return 'en';
                return null; };
              var fromNavigator = function(){
                var nav = navigator; var list = Array.isArray(nav.languages) ? nav.languages.slice() : [];
                if (nav.language) list.push(nav.language);
                if (nav.userLanguage) list.push(nav.userLanguage);
                for (var i=0;i<list.length;i++){ var n = normalize(list[i]); if (n) return n; }
                return 'en'; };
              var desired = null;
              if (qp && supported.indexOf(qp) !== -1) desired = qp;
              else if (stored && supported.indexOf(stored) !== -1) desired = stored;
              else desired = fromNavigator();
              if (!desired || desired === 'en') return; // keep English at root
              var newUrl = new URL(w.location.href);
              newUrl.pathname = '/' + desired + '/';
              newUrl.searchParams.delete('lang');
              w.location.replace(newUrl.toString());
            } catch (e) {} })();`
          }}
        />
      </head>
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
