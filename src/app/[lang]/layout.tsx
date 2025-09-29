import { I18nProvider } from '@/i18n/I18nProvider';

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    { lang: 'ja' },
    { lang: 'ko' },
    { lang: 'zh' },
    { lang: 'ru' },
  ];
}

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: 'ja' | 'ko' | 'zh' | 'ru' }> }) {
  const { lang } = await params;
  return (
    <I18nProvider initialLocale={lang}>
      {children}
    </I18nProvider>
  );
}


