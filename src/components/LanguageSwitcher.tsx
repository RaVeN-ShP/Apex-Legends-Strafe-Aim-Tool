'use client';

import { useI18n, Locale } from '@/i18n/I18nProvider';

const flag: Record<Locale, string> = {
  en: '🇺🇸',
  ja: '🇯🇵',
  ko: '🇰🇷',
  zh: '🇨🇳'
};

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const options: { value: Locale; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
    { value: 'zh', label: '中文' }
  ];

  return (
    <div className="inline-flex items-center gap-2">
      <label className="text-xs text-white/70">Lang</label>
      <div className="relative">
        <select
          value={locale}
          onChange={(e) => {
            const newLocale = e.target.value as Locale;
            setLocale(newLocale);
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              if (newLocale === 'en') {
                url.searchParams.delete('lang');
              } else {
                url.searchParams.set('lang', newLocale);
              }
              window.history.replaceState({}, '', url.toString());
            }
          }}
          className="appearance-none pr-7 bg-black/30 border border-white/10 text-white text-xs rounded px-2 py-1 outline-none hover:bg-black/40"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-gray-800 text-white">
              {flag[opt.value]}  {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-white/60 text-[10px]">▼</span>
      </div>
    </div>
  );
}
