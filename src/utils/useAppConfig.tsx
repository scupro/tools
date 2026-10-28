import React, { createContext, useContext, useEffect, useState } from 'react';
import { Lang } from './i18n';

type Theme = 'dark' | 'light';

interface AppConfig {
  lang: Lang;
  setLang: (lang: Lang) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const AppConfigContext = createContext<AppConfig>({
  lang: 'ES',
  setLang: () => {},
  theme: 'dark',
  setTheme: () => {},
});

const LANG_KEY = 'atm_lang';
const THEME_KEY = 'atm_theme';

const HTML_LANG: Record<Lang, string> = {
  ES: 'es',
  EN: 'en',
  ZH: 'zh-Hant',
};

function detectLang(): Lang {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === 'ES' || saved === 'EN' || saved === 'ZH') return saved;

  const nav = (navigator.language || '').toLowerCase();
  if (nav.startsWith('zh')) return 'ZH';
  if (nav.startsWith('es')) return 'ES';
  return 'EN';
}

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang];
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('dark', 'light');
    html.classList.add(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const setLang = (next: Lang) => setLangState(next);
  const setTheme = (next: Theme) => setThemeState(next);

  return (
    <AppConfigContext.Provider value={{ lang, setLang, theme, setTheme }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  return useContext(AppConfigContext);
}

export type { Lang, Theme };