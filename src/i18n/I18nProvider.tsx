'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type Locale = 'en' | 'ja' | 'ko' | 'zh';

type Messages = Record<string, string>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

// Static import of messages to keep it simple and SSR-friendly
import en from './messages/en.json';
import ja from './messages/ja.json';
import ko from './messages/ko.json';
import zh from './messages/zh.json';

const allMessages: Record<Locale, Messages> = { en, ja, ko, zh };

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    const msg = (allMessages[locale] && allMessages[locale][key]) ?? key;
    if (!vars) return msg;
    return Object.keys(vars).reduce((acc, k) => acc.replace(new RegExp(`{${k}}`, 'g'), String(vars[k])), msg);
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
