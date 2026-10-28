import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun, ChevronDown, ExternalLink } from 'lucide-react';
import { useAppConfig } from '../../utils/useAppConfig';
import { i18n, Lang } from '../../utils/i18n';
import Logo from './Logo';

function Flag({ lang }: { lang: Lang }) {
  if (lang === 'ES') {
    return (
      <svg width="16" height="12" viewBox="0 0 640 480" className="rounded-sm shrink-0" aria-hidden="true">
        <rect width="640" height="480" fill="#c60b1e" />
        <rect width="640" height="240" y="120" fill="#ffc400" />
      </svg>
    );
  }
  if (lang === 'EN') {
    return (
      <svg width="16" height="12" viewBox="0 0 640 480" className="rounded-sm shrink-0" aria-hidden="true">
        <rect width="640" height="480" fill="#012169" />
        <path d="M0,0 L640,480 M640,0 L0,480" stroke="#fff" strokeWidth="60" />
        <path d="M0,0 L640,480 M640,0 L0,480" stroke="#C8102E" strokeWidth="40" />
        <path d="M320,0 L320,480 M0,240 L640,240" stroke="#fff" strokeWidth="120" />
        <path d="M320,0 L320,480 M0,240 L640,240" stroke="#C8102E" strokeWidth="80" />
      </svg>
    );
  }
  return (
    <svg width="16" height="12" viewBox="0 0 640 480" className="rounded-sm shrink-0" aria-hidden="true">
      <rect width="640" height="480" fill="#fe0000" />
      <rect width="320" height="240" fill="#000095" />
      <circle cx="160" cy="120" r="55" fill="#fff" />
      <circle cx="160" cy="120" r="40" fill="#000095" />
      <circle cx="160" cy="120" r="22" fill="#fff" />
    </svg>
  );
}

const LANG_LABELS: Record<Lang, string> = {
  ZH: '正體中文',
  EN: 'English',
  ES: 'Español',
};

export function Navbar() {
  const { theme, setTheme, lang, setLang } = useAppConfig();
  const dict = i18n[lang];
  const [langOpen, setLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [storageSize, setStorageSize] = useState('0');
  const langRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let total = 0;
    for (const key in localStorage) {
      if (!Object.prototype.hasOwnProperty.call(localStorage, key)) continue;
      total += (localStorage[key].length + key.length) * 2;
    }
    setStorageSize((total / 1024).toFixed(2));
  }, [profileOpen]);

  const clearStorage = () => {
    const themeSave = localStorage.getItem('atm_theme');
    const langSave = localStorage.getItem('atm_lang');
    localStorage.clear();
    if (themeSave) localStorage.setItem('atm_theme', themeSave);
    if (langSave) localStorage.setItem('atm_lang', langSave);
    setStorageSize('0.00');
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const chooseLang = (next: Lang) => {
    setLang(next);
    setLangOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-white/80 dark:bg-[#0a0e17]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center px-6">
      <a href="#/" className="flex items-center gap-3 no-underline hover:opacity-90 transition-opacity">
        <Logo size={28} className="w-7 h-7 shrink-0" decorative />
        <span className="text-[13.5px] font-extrabold tracking-[0.14em] uppercase text-slate-900 dark:text-[#f8fafc]">DOGBRO TOOLS</span>
      </a>

      <div className="flex items-center gap-4 ml-auto">
        {/* Language Selector */}
        <div className="relative" ref={langRef}>
          <button
            id="lang-selector"
            onClick={() => setLangOpen(!langOpen)}
            aria-label={dict.s['nav.language']}
            aria-expanded={langOpen}
            className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors text-sm font-medium"
          >
            <Flag lang={lang} />
            {lang === 'ZH' ? 'ZH' : lang}
            <ChevronDown size={14} className="text-slate-500" />
          </button>

          {langOpen && (
            <div className="absolute top-full right-0 mt-2 w-36 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg py-1 shadow-xl z-50">
              {(['ZH', 'EN', 'ES'] as Lang[]).map((code) => (
                <button
                  key={code}
                  onClick={() => chooseLang(code)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <Flag lang={code} /> {LANG_LABELS[code]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          id="theme-toggle"
          type="button"
          aria-label={dict.s['nav.theme']}
          title={dict.s['nav.theme']}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 dark:border-[#1f2937] text-slate-600 dark:text-[#94a3b8] transition-colors bg-transparent cursor-pointer"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="h-5 w-px bg-slate-300 dark:bg-slate-800 mx-1"></div>

        {/* Company / account menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label={dict.s['nav.account']}
            aria-expanded={profileOpen}
            className="flex items-center gap-2 bg-white dark:bg-[#11161d] border border-slate-300 dark:border-[#1f2937] rounded-full pl-1 pr-3 py-1 cursor-pointer transition-colors hover:border-blue-500"
          >
            <Logo size={24} className="w-6 h-6 shrink-0" decorative />
            <span className="text-[13px] font-medium text-slate-900 dark:text-[#f8fafc]">Dogbro</span>
          </button>

          {profileOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 shadow-2xl text-xs backdrop-blur-md z-50">
              <div className="flex items-center gap-3">
                <Logo size={32} className="w-8 h-8 shrink-0" decorative />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Dogbro LLC</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{dict.s['nav.accountRole']}</p>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800/80 my-2.5"></div>

              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-600 dark:text-slate-400">{dict.s['nav.storage']}</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{storageSize} KB</span>
              </div>

              <button
                onClick={clearStorage}
                className="text-left w-full text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors py-1 cursor-pointer"
              >
                {dict.s['nav.clearStorage']}
              </button>

              <div className="border-t border-slate-200 dark:border-slate-800/80 my-2.5"></div>

              <a
                href="https://dogbro.store"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-1 flex items-center justify-between no-underline"
              >
                <span>dogbro.store</span>
                <ExternalLink size={14} className="text-slate-500" />
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}