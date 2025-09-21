import { NextResponse, type NextRequest } from 'next/server';

const supported = new Set(['en', 'ja', 'ko', 'zh', 'ru']);

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // Redirect legacy ?lang= param to path prefix
  const langParam = url.searchParams.get('lang');
  if (langParam && supported.has(langParam)) {
    url.searchParams.delete('lang');
    // Avoid double prefix
    const segments = url.pathname.split('/').filter(Boolean);
    const hasLocale = segments.length > 0 && supported.has(segments[0]);
    const rest = hasLocale ? segments.slice(1) : segments;
    const prefix = langParam === 'en' ? '' : `/${langParam}`;
    url.pathname = `${prefix}/${rest.join('/')}`.replace(/\/+$/, '').replace(/\/\//g, '/') || '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|robots.txt|sitemap.xml|opengraph-image|twitter-image).*)'],
};


