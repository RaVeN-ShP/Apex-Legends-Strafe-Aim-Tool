'use client';

import { useI18n, Locale } from '@/i18n/I18nProvider';
import { Listbox } from '@headlessui/react';

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

  const onChange = (newLocale: Locale) => {
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
  };

  return (
    <div className="inline-flex items-center gap-2">
      <label className="text-xs text-white/70">Lang</label>
      <Listbox value={locale} onChange={onChange}>
        <div className="relative">
          <Listbox.Button className="flex items-center gap-1 bg-black/30 border border-white/10 text-white text-xs rounded px-2 py-1 outline-none hover:bg-black/40">
            <span className="text-base leading-none">{flag[locale]}</span>
            <span className="ml-1">{options.find(o => o.value === locale)?.label ?? locale.toUpperCase()}</span>
            <span className="ml-1 text-white/60 text-[10px]">▼</span>
          </Listbox.Button>
          <Listbox.Options className="absolute right-0 mt-1 z-20 min-w-[140px] rounded-md border border-white/15 bg-black/90 shadow-lg focus:outline-none">
            {options.map((opt) => (
              <Listbox.Option key={opt.value} value={opt.value} className={({ active }) => `px-2 py-1.5 text-xs flex items-center gap-2 ${active ? 'bg-white/10' : ''}`}>
                <span className="text-base leading-none">{flag[opt.value]}</span>
                <span className="text-white/90">{opt.label}</span>
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
}
