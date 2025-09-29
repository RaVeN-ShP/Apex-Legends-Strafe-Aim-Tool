import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = {
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  };

  const locales: Array<[string, string]> = [
    ['en', `${siteUrl}`],
    ['ja', `${siteUrl}ja`],
    ['ko', `${siteUrl}ko`],
    ['zh', `${siteUrl}zh`],
    ['ru', `${siteUrl}ru`],
  ];

  return locales.map(([, url]) => ({ url, ...base }));
}


