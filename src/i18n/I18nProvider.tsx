'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Locale = 'en' | 'ja' | 'ko' | 'zh' | 'ru';

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
import ru from './messages/ru.json';

const allMessages: Record<Locale, Messages> = { en, ja, ko, zh, ru };

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    // Initialize locale priority:
    // 1) URL pathname prefix /:lang
    // 2) URL ?lang=
    // 3) persisted preference (localStorage)
    // 4) browser language (navigator.language / navigator.languages)
    if (typeof window !== 'undefined') {
      const supported: Locale[] = ['en', 'ja', 'ko', 'zh', 'ru'];

      const fromPath = () => {
        const segments = window.location.pathname.split('/').filter(Boolean);
        const first = (segments[0] ?? '').toLowerCase();
        if (supported.includes(first as Locale)) return first as Locale;
        return null;
      };

      const fromUrl = () => {
        const params = new URLSearchParams(window.location.search);
        const lang = params.get('lang') as Locale | null;
        if (lang && supported.includes(lang)) return lang;
        return null;
      };

      const fromStorage = () => {
        try {
          const stored = window.localStorage.getItem('preferred_locale') as Locale | null;
          if (stored && supported.includes(stored)) return stored;
        } catch {}
        return null;
      };

      const normalize = (value: string | undefined | null): Locale | null => {
        if (!value) return null;
        const lower = value.toLowerCase();
        if (lower.startsWith('ja')) return 'ja';
        if (lower.startsWith('ko')) return 'ko';
        if (lower.startsWith('zh')) return 'zh';
        if (lower.startsWith('ru')) return 'ru';
        if (lower.startsWith('en')) return 'en';
        return null;
      };

      const fromNavigator = () => {
        const nav = window.navigator as Navigator & { userLanguage?: string };
        const candidates: Array<string | undefined> = [];
        if (Array.isArray(nav.languages)) candidates.push(...nav.languages);
        candidates.push(nav.language, nav.userLanguage);
        for (const cand of candidates) {
          const norm = normalize(cand);
          if (norm) return norm;
        }
        return null;
      };

      const chosen = fromPath() ?? fromUrl() ?? fromStorage() ?? fromNavigator() ?? 'en';
      setLocale(chosen);
    }
  }, []);

  // Persist and reflect current locale
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('preferred_locale', locale);
      } catch {}
      try {
        document.documentElement.lang = locale;
      } catch {}
    }
  }, [locale]);

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
