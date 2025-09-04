import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from '@/i18n/I18nProvider';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Apex Legends Strafe Aiming Tool",
  description: "Master strafe aiming techniques in Apex Legends with audio cues and perfect timing. Learn weapon-specific patterns for the firing range.",
  keywords: "apex legends, strafe aiming, strafe control, recoil control, firing range, gaming, fps",
  authors: [{ name: "Apex Legends Strafe Aiming Tool" }],
  robots: "index, follow",
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
      <body className={inter.className}>
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
