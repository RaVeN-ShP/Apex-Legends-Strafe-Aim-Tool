import type { Metadata } from 'next';

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    { lang: 'ja' },
    { lang: 'ko' },
    { lang: 'zh' },
    { lang: 'ru' },
  ];
}

export default function LangLayout({ children }: { children: React.ReactNode }) {
  return children;
}


