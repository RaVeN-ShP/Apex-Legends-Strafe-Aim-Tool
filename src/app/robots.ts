import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const isProd = process.env.NODE_ENV === 'production';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: isProd
      ? {
          userAgent: '*',
          allow: '/',
        }
      : {
          userAgent: '*',
          disallow: '/',
        },
    host: siteUrl,
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}


