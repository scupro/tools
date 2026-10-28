import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Layout } from './components/layout/Layout';
import { CommandPalette } from './components/ui/CommandPalette';
import { Image, Eraser, FileText, Sun, Camera, Search, PenTool, Shield, Volume2, Key, Network, Bitcoin, Clock, Hash, FileJson } from 'lucide-react';
import { useAppConfig } from './utils/useAppConfig';
import { i18n, CategoryId, ToolId, ToolText } from './utils/i18n';

// Tools are code-split so the home page only downloads what it renders.
const UniversalConverter = lazy(() => import('./components/tools/UniversalConverter').then((m) => ({ default: m.UniversalConverter })));
const BackgroundRemover = lazy(() => import('./components/tools/BackgroundRemover').then((m) => ({ default: m.BackgroundRemover })));
const QuickEditor = lazy(() => import('./components/tools/QuickEditor').then((m) => ({ default: m.QuickEditor })));
const PdfManager = lazy(() => import('./components/tools/PdfManager').then((m) => ({ default: m.PdfManager })));
const Scanner = lazy(() => import('./components/tools/Scanner').then((m) => ({ default: m.Scanner })));
const Magnifier = lazy(() => import('./components/tools/Magnifier').then((m) => ({ default: m.Magnifier })));
const SignaturePad = lazy(() => import('./components/tools/SignaturePad').then((m) => ({ default: m.SignaturePad })));
const PrivacyBlur = lazy(() => import('./components/tools/PrivacyBlur').then((m) => ({ default: m.PrivacyBlur })));
const TextReader = lazy(() => import('./components/tools/TextReader').then((m) => ({ default: m.TextReader })));
const DataCrypto = lazy(() => import('./components/tools/DataCrypto').then((m) => ({ default: m.DataCrypto })));
const NetworkCalc = lazy(() => import('./components/tools/NetworkCalc').then((m) => ({ default: m.NetworkCalc })));
const JsonTools = lazy(() => import('./components/tools/JsonTools').then((m) => ({ default: m.JsonTools })));
const Web3Tools = lazy(() => import('./components/tools/Web3Tools').then((m) => ({ default: m.Web3Tools })));
const UuidGenerator = lazy(() => import('./components/tools/UuidGenerator').then((m) => ({ default: m.UuidGenerator })));
const EpochConverter = lazy(() => import('./components/tools/EpochConverter').then((m) => ({ default: m.EpochConverter })));

type Route = 'home' | ToolId;

interface ToolMeta {
  id: ToolId;
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number | string; className?: string }>;
  tags: string[];
  category: CategoryId;
}

const TOOLS: ToolMeta[] = [
  { id: 'bg-remover', icon: Eraser, tags: ['IMAGE', 'CLIENT-SIDE'], category: 'image' },
  { id: 'editor', icon: Sun, tags: ['IMAGE', 'CLIENT-SIDE'], category: 'image' },
  { id: 'converter', icon: Image, tags: ['IMAGE', 'CLIENT-SIDE'], category: 'image' },
  { id: 'pdf', icon: FileText, tags: ['PDF', 'CLIENT-SIDE'], category: 'pdf' },
  { id: 'scanner', icon: Camera, tags: ['PDF', 'IMAGE'], category: 'pdf' },
  { id: 'magnifier', icon: Search, tags: ['IMAGE', 'A11Y'], category: 'image' },
  { id: 'signature', icon: PenTool, tags: ['PDF', 'SIGN'], category: 'pdf' },
  { id: 'privacy', icon: Shield, tags: ['SECURITY', 'CLIENT-SIDE'], category: 'security' },
  { id: 'reader', icon: Volume2, tags: ['TEXT', 'A11Y'], category: 'data' },
  { id: 'crypto', icon: Key, tags: ['SECURITY', 'CRYPTO'], category: 'security' },
  { id: 'network', icon: Network, tags: ['SYSADMIN', 'NETWORK'], category: 'data' },
  { id: 'json', icon: FileJson, tags: ['DEV', 'FORMAT'], category: 'data' },
  { id: 'uuid', icon: Hash, tags: ['DEV', 'CLIENT-SIDE'], category: 'data' },
  { id: 'epoch', icon: Clock, tags: ['DEV', 'CLIENT-SIDE'], category: 'data' },
  { id: 'web3', icon: Bitcoin, tags: ['WEB3', 'CRYPTO'], category: 'web3' },
];

const SECTIONS: { key: 'image' | 'docs' | 'eng' | 'security'; tools: ToolId[] }[] = [
  { key: 'image', tools: ['bg-remover', 'editor', 'converter', 'scanner', 'magnifier'] },
  { key: 'docs', tools: ['pdf', 'signature', 'privacy', 'reader'] },
  { key: 'eng', tools: ['network', 'json', 'uuid', 'epoch'] },
  { key: 'security', tools: ['crypto', 'web3'] },
];

const FILTERS: CategoryId[] = ['all', 'image', 'pdf', 'security', 'data', 'web3'];

function readRoute(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return TOOLS.some((t) => t.id === raw) ? (raw as ToolId) : 'home';
}

function ToolCard({
  id,
  icon: Icon,
  tags,
  meta,
  onOpen,
}: {
  id: ToolId;
  icon: ToolMeta['icon'];
  tags: string[];
  meta: ToolText;
  onOpen: (id: ToolId) => void;
}) {
  return (
    <button
      onClick={() => onOpen(id)}
      className="group flex items-start text-left bg-white dark:bg-[#11161d] border border-slate-200/80 dark:border-[#1f2937] p-[22px] rounded-[18px] transition-all hover:border-blue-500/50 shadow-sm relative overflow-hidden"
    >
      <div className="w-10 h-10 shrink-0 bg-blue-600 rounded-full flex items-center justify-center mr-4 text-white font-bold text-[13px] tracking-wide relative">
        <Icon size={18} strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[1.05rem] font-bold text-slate-900 dark:text-[#f8fafc] tracking-[-0.02em] mb-1.5 truncate">
          {meta.name}
        </h3>
        <p className="text-[0.92rem] text-slate-600 dark:text-[#94a3b8] mb-3 line-clamp-2 leading-relaxed">
          {meta.desc}
        </p>
        <div className="flex items-center gap-1.5 mt-auto">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold tracking-wider bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 uppercase"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CategoryId>('all');
  const [cmdOpen, setCmdOpen] = useState(false);
  const { lang } = useAppConfig();
  const dict = i18n[lang];

  const navigate = (next: Route) => {
    if (next === 'home') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } else {
      window.location.hash = `/${next}`;
    }
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const sync = () => setRoute(readRoute());
    window.addEventListener('hashchange', sync);
    if (window.location.hash) sync();
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return TOOLS.filter((tool) => {
      const text = dict.tools[tool.id];
      const matchesSearch =
        q === '' ||
        text.name.toLowerCase().includes(q) ||
        text.desc.toLowerCase().includes(q) ||
        tool.tags.some((tag) => tag.toLowerCase().includes(q));
      const matchesFilter = activeFilter === 'all' || tool.category === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter, dict]);

  const renderTool = () => {
    switch (route) {
      case 'converter': return <UniversalConverter onBack={() => navigate('home')} />;
      case 'bg-remover': return <BackgroundRemover onBack={() => navigate('home')} />;
      case 'editor': return <QuickEditor onBack={() => navigate('home')} />;
      case 'pdf': return <PdfManager onBack={() => navigate('home')} />;
      case 'scanner': return <Scanner onBack={() => navigate('home')} />;
      case 'magnifier': return <Magnifier onBack={() => navigate('home')} />;
      case 'signature': return <SignaturePad onBack={() => navigate('home')} />;
      case 'privacy': return <PrivacyBlur onBack={() => navigate('home')} />;
      case 'reader': return <TextReader onBack={() => navigate('home')} />;
      case 'crypto': return <DataCrypto onBack={() => navigate('home')} />;
      case 'network': return <NetworkCalc onBack={() => navigate('home')} />;
      case 'json': return <JsonTools onBack={() => navigate('home')} />;
      case 'uuid': return <UuidGenerator onBack={() => navigate('home')} />;
      case 'epoch': return <EpochConverter onBack={() => navigate('home')} />;
      case 'web3': return <Web3Tools onBack={() => navigate('home')} />;
      default: return null;
    }
  };

  const sectionTitle = (key: 'image' | 'docs' | 'eng' | 'security') =>
    key === 'image'
      ? dict.s['home.section.image']
      : key === 'docs'
        ? dict.s['home.section.docs']
        : key === 'eng'
          ? dict.s['home.section.eng']
          : dict.s['home.section.security'];

  const isSearching = searchQuery.trim() !== '' || activeFilter !== 'all';

  return (
    <Layout>
      <CommandPalette
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onSelect={(id) => navigate(id as ToolId)}
        tools={TOOLS.map((t) => ({ id: t.id, icon: t.icon, tags: t.tags }))}
      />
      {route === 'home' ? (
        <div className="max-w-6xl mx-auto px-6 pt-10 pb-16">
          <div className="text-left pt-3 pb-7 bg-transparent border-0">
            <p className="text-xs tracking-[0.12em] uppercase text-slate-500 font-semibold mb-3">{dict.meta.supra}</p>
            <h1 className="text-[2.2rem] leading-[1.1] font-extrabold tracking-[-0.04em] text-slate-900 dark:text-slate-50 mb-4">{dict.meta.title}</h1>
            <p className="text-[1.1rem] leading-relaxed text-slate-600 dark:text-slate-400 max-w-[640px]">{dict.meta.subtitle}</p>
          </div>

          <div className="block mb-4">
            <label className="block w-full">
              <input
                type="search"
                placeholder={dict.meta.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                spellCheck="false"
                className="w-full max-w-full bg-white dark:bg-[#11161d] border border-slate-300 dark:border-[#1f2937] text-slate-900 dark:text-[#f8fafc] placeholder:text-slate-400 dark:placeholder:text-slate-500 text-base px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:border-blue-600 transition-colors"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-8">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold mr-1">{dict.meta.filterBy}</span>
            {FILTERS.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                aria-pressed={activeFilter === cat}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  activeFilter === cat
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white dark:bg-[#11161d] border-slate-300 dark:border-[#1f2937] text-slate-600 dark:text-slate-400 hover:border-blue-500/60'
                }`}
              >
                {dict.categories[cat]}
              </button>
            ))}
          </div>

          {isSearching ? (
            <>
              <h2 className="text-xs tracking-wider uppercase text-slate-600 dark:text-slate-400 font-bold mb-4 border-b border-slate-200 dark:border-slate-800/60 pb-2">
                {dict.s['home.results']}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    id={tool.id}
                    icon={tool.icon}
                    tags={tool.tags}
                    meta={dict.tools[tool.id]}
                    onOpen={navigate}
                  />
                ))}
                {filteredTools.length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-500 text-sm">{dict.meta.noResults}</div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-10">
              {SECTIONS.map((section) => (
                <div key={section.key}>
                  <h2 className="text-xs tracking-wider uppercase text-slate-600 dark:text-slate-400 font-bold mb-4 border-b border-slate-200 dark:border-slate-800/60 pb-2">
                    {sectionTitle(section.key)}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {section.tools.map((toolId) => {
                      const tool = TOOLS.find((t) => t.id === toolId);
                      if (!tool) return null;
                      return (
                        <ToolCard
                          key={tool.id}
                          id={tool.id}
                          icon={tool.icon}
                          tags={tool.tags}
                          meta={dict.tools[tool.id]}
                          onOpen={navigate}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-16">
          <Suspense fallback={<div className="py-24 text-center text-slate-600 dark:text-slate-400" role="status">{dict.s['common.processing']}</div>}>
            {renderTool()}
          </Suspense>
        </div>
      )}
    </Layout>
  );
}

export default App;