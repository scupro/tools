import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { i18n } from '../../utils/i18n';
import { useAppConfig } from '../../utils/useAppConfig';

type PaletteTool = {
  id: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  tags: string[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  tools: PaletteTool[];
};

export function CommandPalette({ isOpen, onClose, onSelect, tools }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { lang } = useAppConfig();
  const dict = i18n[lang];

  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const r = localStorage.getItem('recent_tools');
      return r ? JSON.parse(r) : [];
    } catch {
      return [];
    }
  });

  const filteredTools =
    query === ''
      ? tools
          .filter((t) => recent.includes(t.id))
          .sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id))
      : tools.filter((t) => {
          const meta = dict.tools[t.id as keyof typeof dict.tools];
          const q = query.toLowerCase();
          return (
            meta.name.toLowerCase().includes(q) ||
            meta.desc.toLowerCase().includes(q) ||
            t.tags.some((tag) => tag.toLowerCase().includes(q))
          );
        });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (id: string) => {
    const newRecent = [id, ...recent.filter((r) => r !== id)].slice(0, 3);
    setRecent(newRecent);
    localStorage.setItem('recent_tools', JSON.stringify(newRecent));
    onSelect(id);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredTools.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (filteredTools.length || 1)) % (filteredTools.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTools[selectedIndex]) handleSelect(filteredTools[selectedIndex].id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center px-4 py-3 border-b border-slate-800">
          <Search size={18} className="text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-slate-200 focus:outline-none placeholder:text-slate-500"
            placeholder={dict.s['palette.placeholder']}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded ml-2" onClick={onClose}>
            ESC
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
          {query === '' && recent.length > 0 && (
            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {dict.s['palette.recent']}
            </div>
          )}
          {query !== '' && filteredTools.length > 0 && (
            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {dict.s['palette.results']}
            </div>
          )}

          {filteredTools.map((tool, idx) => (
            <button
              key={tool.id}
              onClick={() => handleSelect(tool.id)}
              className={`w-full flex items-center px-3 py-3 rounded-lg text-left transition-colors ${
                idx === selectedIndex ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <tool.icon size={16} className={`mr-3 ${idx === selectedIndex ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className="flex-1 font-medium text-sm">{dict.tools[tool.id as keyof typeof dict.tools].name}</span>
              <div className="flex gap-2">
                {tool.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50 uppercase font-mono"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}

          {filteredTools.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              {dict.s['palette.empty'].replace('{query}', query)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}