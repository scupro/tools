// Static verification for the Dogbro build: i18n completeness, Traditional
// Chinese correctness, branding, and the CSP that background removal depends on.
// Run with: node --experimental-strip-types tests/verify.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
let failed = 0;

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failed++;
}

function read(p) {
  return readFileSync(join(root, p), 'utf8');
}

// ---------------------------------------------------------------- i18n
const { i18n } = await import(join(root, 'src/utils/i18n.ts'));
const LANGS = ['ES', 'EN', 'ZH'];

check('i18n exposes exactly ES/EN/ZH', Object.keys(i18n).sort().join() === 'EN,ES,ZH', Object.keys(i18n).join());

const keysOf = (o) => Object.keys(o).sort();
const sKeys = Object.fromEntries(LANGS.map((l) => [l, keysOf(i18n[l].s)]));
const base = sKeys.ES;

for (const lang of ['EN', 'ZH']) {
  const missing = base.filter((k) => !sKeys[lang].includes(k));
  const extra = sKeys[lang].filter((k) => !base.includes(k));
  check(`${lang}: all UI string keys present`, missing.length === 0, `missing: ${missing.slice(0, 8).join(', ')}`);
  check(`${lang}: no unknown UI string keys`, extra.length === 0, `extra: ${extra.slice(0, 8).join(', ')}`);
}

for (const lang of ['EN', 'ZH']) {
  const missingTools = keysOf(i18n.ES.tools).filter((k) => !(k in i18n[lang].tools));
  const missingCats = keysOf(i18n.ES.categories).filter((k) => !(k in i18n[lang].categories));
  const missingMeta = keysOf(i18n.ES.meta).filter((k) => !(k in i18n[lang].meta));
  check(`${lang}: tool names/descriptions complete`, missingTools.length === 0, missingTools.join(', '));
  check(`${lang}: category labels complete`, missingCats.length === 0, missingCats.join(', '));
  check(`${lang}: meta strings complete`, missingMeta.length === 0, missingMeta.join(', '));
}

// {placeholders} must match across languages, otherwise fmt() leaks "{}" into the UI.
const ph = (s) => (s.match(/\{(\w+)\}/g) || []).sort().join(',');
let phBad = [];
for (const k of base) {
  const want = ph(i18n.ES.s[k]);
  for (const lang of ['EN', 'ZH']) {
    if (ph(i18n[lang].s[k]) !== want) phBad.push(`${lang}:${k}`);
  }
}
check('placeholders identical across languages', phBad.length === 0, phBad.slice(0, 8).join(', '));

// Empty strings would silently render blank labels.
const empties = [];
for (const lang of LANGS) {
  for (const [k, v] of Object.entries(i18n[lang].s)) {
    if (!String(v).trim()) empties.push(`${lang}:${k}`);
  }
}
check('no empty translations', empties.length === 0, empties.slice(0, 8).join(', '));

// ------------------------------------------------- Traditional Chinese check
// Characters that exist only in the simplified set (a hit means it was translated
// from a simplified source). Brand names and units are allowed.
const SIMPLIFIED_ONLY = '国图数网转复选应该时说这个们对开发条处输赢点击开关闭门问题灭严丝两丰富临为丽举么义乌乐乔习乡书买乱争亏亚产亩亲亿仅从仓仪们价众优伙会伟传伤伦伪伞伟传'.split('');
const zhStrings = [];
for (const v of Object.values(i18n.ZH.s)) zhStrings.push(String(v));
for (const t of Object.values(i18n.ZH.tools)) zhStrings.push(t.name, t.desc);
for (const v of Object.values(i18n.ZH.categories)) zhStrings.push(String(v));
for (const v of Object.values(i18n.ZH.meta)) zhStrings.push(String(v));
const simplifiedHits = new Set();
for (const s of zhStrings) for (const ch of s) if (SIMPLIFIED_ONLY.includes(ch)) simplifiedHits.add(ch);
check('ZH uses Traditional characters only', simplifiedHits.size === 0, [...simplifiedHits].join(' '));

// Traditional-only markers should show up somewhere, proving it is not just copied ES/EN.
const zhJoined = zhStrings.join('');
const traditionalMarkers = ['個', '這', '們', '檔', '轉', '為', '與', '時', '開', '關', '後', '區', '設', '連'];
const markerHits = traditionalMarkers.filter((m) => zhJoined.includes(m));
check('ZH looks like real Traditional Chinese', markerHits.length >= 8, `markers: ${markerHits.join('')}`);

// Untranslated leakage: ZH/EN values identical to a *Spanish* source string.
// Technical terms ("JWT", "Base64", "Keccak-256", "ISO 8601") are identical in all
// three languages and are not leakage, so only Spanish-looking text is flagged:
// diacritics/ñ, or Spanish function words.
const ALLOW_SAME = new Set(['nav.accountRole', 'footer.rights', 'nav.langEs', 'nav.langEn', 'nav.langZh']); // brand + endonyms
const looksSpanish = (s) => /[áéíóúñ¿¡ü]/i.test(s) || /\b(de|del|la|el|los|las|una|para|con|que|tu|más)\b/i.test(s);
const sameAsEs = [];
for (const k of base) {
  if (ALLOW_SAME.has(k)) continue;
  const es = i18n.ES.s[k];
  if (!looksSpanish(es)) continue;
  if (i18n.ZH.s[k] === es) sameAsEs.push(`ZH:${k}`);
  if (i18n.EN.s[k] === es) sameAsEs.push(`EN:${k}`);
}
check('no translations left identical to Spanish', sameAsEs.length === 0, sameAsEs.slice(0, 10).join(', '));

// ---------------------------------------------------------------- branding
const ALL_FILES = [];
(function walk(dir) {
  for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(e.name)) continue;
    const rel = join(dir, e.name);
    if (e.isDirectory()) walk(rel);
    else if (/\.(ts|tsx|html|txt|xml|json|md|webmanifest)$/.test(e.name)) ALL_FILES.push(rel);
  }
})('.');

const oldBrand = ALL_FILES.filter((f) => read(f).includes('trujillomingorance'));
check('no legacy domain left in sources', oldBrand.length === 0, oldBrand.join(', '));

const html = read('index.html');
check('index.html branded as Dogbro', html.includes('Dogbro Tools') && html.includes('https://dogbro.store'));

// ---------------------------------------------------------------- language switch
const navbar = read('src/components/layout/Navbar.tsx');
check("language switch offers ES/EN/ZH only", /\['ZH', 'EN', 'ES'\]/.test(navbar));
check('language labels are 正體中文 / English / Español',
  /ZH:\s*'正體中文'/.test(navbar) && /EN:\s*'English'/.test(navbar) && /ES:\s*'Español'/.test(navbar));

// ---------------------------------------------------------------- CSP
const headers = read('public/_headers');
const csp = (headers.match(/Content-Security-Policy:\s*(.+)/) || [])[1] || '';
const directive = (name) => ((csp.match(new RegExp(`${name}\\s+([^;]+)`)) || [])[1] || '').trim();
const connect = directive('connect-src');
const script = directive('script-src');
const worker = directive('worker-src');

check('CSP present in public/_headers', csp.length > 0);
check('CSP permits the model CDN (huggingface.co)', connect.includes('https://huggingface.co'), connect);
check('CSP permits the model storage redirect (*.hf.co)', connect.includes('https://*.hf.co'), connect);
check('no AGPL model host left in CSP', !/imgly|img\.ly/.test(connect), connect);
check('CSP permits wasm compilation', script.includes("'wasm-unsafe-eval'"), script);
check('CSP permits blob: workers', worker.includes('blob:'), worker);
check('CSP forbids unsafe-eval', !/script-src[^;]*'unsafe-eval'/.test(csp), script);
check('CSP forbids inline script', !/script-src[^;]*'unsafe-inline'/.test(csp), script);
check('CSP keeps frame-ancestors none', csp.includes("frame-ancestors 'none'"));

const pkg = JSON.parse(read('package.json'));
check('AGPL background-removal package removed', !('@imgly/background-removal' in pkg.dependencies), Object.keys(pkg.dependencies).join(','));
check('onnxruntime-web (MIT) is a declared dependency', 'onnxruntime-web' in pkg.dependencies);
check('no postinstall CSP patch script', !String(pkg.scripts.postinstall || '').includes('patch-imgly'));
check('ORT runtime is self-hosted (/ort/ wasmPaths)', read('src/utils/removeBg.ts').includes("wasmPaths = '/ort/'"));
check('model is the Apache-2.0 ISNet export', read('src/utils/removeBg.ts').includes('techycoder/isnet-background-removal'));
const imglyImports = [];
(function walkSrc(dir) {
  for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (e.isDirectory()) walkSrc(join(dir, e.name));
    else if (/\.(ts|tsx)$/.test(e.name) && read(join(dir, e.name)).includes('@imgly/')) imglyImports.push(join(dir, e.name));
  }
})('src');
check('no imgly import left in src', imglyImports.length === 0, imglyImports.join(','));
// The app must not reach any other third-party origin for its model.
check('no auth endpoint call left', !read('src/utils/image.ts').includes('guides.trujillomingorance'));

// ---------------------------------------------------------------- no stray Spanish in UI code
const SPANISH = /\b(archivo|archivos|imagen|imágenes|resultado|descargar|selecciona|seleccione|tamaño|contraseña|formato|borrar|añadir|pegar|arrastrar|elige|ninguno|también|aquí|puedes|debes|nuevo|nueva|cambiar|guardar|copiado|error al)\b/i;
const components = [];
(function walk(dir) {
  for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (e.isDirectory()) walk(join(dir, e.name));
    else if (e.name.endsWith('.tsx')) components.push(join(dir, e.name));
  }
})('src');
const leaks = [];
for (const f of components) {
  const text = read(f)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{[^}]*\}/g, '{}');
  // Only flagged when inside a quoted literal, so identifiers stay safe.
  for (const m of text.matchAll(/(['"`])([^'"`\n]{3,})\1/g)) {
    if (SPANISH.test(m[2])) leaks.push(`${f}: ${m[2].slice(0, 60)}`);
  }
}
check('no hardcoded Spanish UI text in components', leaks.length === 0, leaks.slice(0, 6).join(' | '));

// ---------------------------------------------------------------- report
const width = Math.max(...results.map((r) => r.name.length));
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(width)} ${r.ok || !r.detail ? '' : '→ ' + r.detail}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);