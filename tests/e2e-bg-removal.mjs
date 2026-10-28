// End-to-end check of the background remover under the *production* CSP.
//
// dist/ is served by a small static server that applies the same CSP as
// public/_headers, then a headless Chromium loads #/bg-remover, uploads a real
// photo, clicks the button and waits for the transparent PNG.
//
// Every CDP call has a timeout, a crashed renderer is reported instead of
// hanging, and progress is driven by a Node timer (not by page evaluation) so
// a busy main thread cannot wedge the harness.
//
// Run with: node tests/e2e-bg-removal.mjs [--max=seconds]
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync, rmSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/ missing — run `npm run build` first.');
  process.exit(2);
}
const MAX_MS = Number((process.argv.find((a) => a.startsWith('--max=')) || '').split('=')[1] || 420) * 1000;

// Anything served by Hugging Face: the model download plus its CDN redirect.
const isModelUrl = (url) => /(^|\.)huggingface\.co\/|(^|\.)hf\.co\//.test(url || '');

// ------------------------------------------------------------------ test image
// A synthetic subject with unambiguous geometry: red disc on a white field.
// A correct matte must be transparent in the four corners and opaque in the
// middle, which is what the assertions below check.
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();
const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
function makeDiscPng(width, height) {
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.3;
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    raw[row] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const inside = (x - cx) ** 2 + (y - cy) ** 2 < r * r;
      const i = row + 1 + x * 3;
      raw[i] = inside ? 214 : 255;
      raw[i + 1] = inside ? 40 : 255;
      raw[i + 2] = inside ? 40 : 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
const fixture = join(tmpdir(), 'bg-removal-disc.png');
writeFileSync(fixture, makeDiscPng(800, 600));

// ------------------------------------------------------------------ CSP server
const headersFile = readFileSync(join(dist, '_headers'), 'utf8');
const csp = (headersFile.match(/Content-Security-Policy:\s*(.+)/) || [])[1]?.trim();
if (!csp) { console.error('no CSP found in dist/_headers'); process.exit(2); }

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8', '.map': 'application/json',
};

const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = join(dist, url);
  if (!existsSync(file) || statSync(file).isDirectory()) {
    if (extname(url)) {                       // a missing asset must fail loudly
      res.writeHead(404, { 'Content-Security-Policy': csp });
      res.end('not found');
      return;
    }
    file = existsSync(join(dist, url + '.html')) ? join(dist, url + '.html') : join(dist, 'index.html');
  }
  res.writeHead(200, {
    'Content-Type': MIME[extname(file)] || 'application/octet-stream',
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
console.log(`serving dist/ at ${origin} with the production CSP`);

// ------------------------------------------------------------------ chromium
const profile = join(tmpdir(), `dogbro-e2e-${Date.now()}`);
mkdirSync(profile, { recursive: true });
const PORT = 9400 + Math.floor(Math.random() * 200);
const chrome = spawn('chromium', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--js-flags=--max-old-space-size=3072',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=1280,900', 'about:blank',
], { stdio: 'ignore' });

let shuttingDown = false;
function finish(code, note = '') {
  if (shuttingDown) return;
  shuttingDown = true;
  if (note) console.log(note);
  try { chrome.kill('SIGKILL'); } catch {}
  try { server.close(); } catch {}
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(code);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let wsUrl;
for (let i = 0; i < 100; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const page = list.find((t) => t.type === 'page');
    if (page?.webSocketDebuggerUrl) { wsUrl = page.webSocketDebuggerUrl; break; }
  } catch {}
  await sleep(200);
}
if (!wsUrl) finish(1, 'chromium did not expose a CDP target');

// ------------------------------------------------------------------ CDP client
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws failed')); });

let seq = 0;
const pending = new Map();
const events = [];
let crashed = null;

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject, timer } = pending.get(msg.id);
    pending.delete(msg.id);
    clearTimeout(timer);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else if (msg.method) {
    if (msg.method === 'Target.targetCrashed' || msg.method === 'Inspector.targetCrashed') crashed = msg.params;
    if (msg.method === 'Target.attachedToTarget') {
      const sid = msg.params.sessionId;
      const t = msg.params.targetInfo;
      console.log(`  [target] ${t.type} ${t.url.slice(0, 60)}`);
      events.push({ method: 'Worker.attached', params: { sessionId: sid, type: t.type } });
      for (const m of ['Runtime.enable', 'Log.enable']) {
        try { ws.send(JSON.stringify({ id: ++seq, method: m, params: {}, sessionId: sid })); } catch {}
      }
    }
    msg.sessionId = msg.sessionId || null;
    events.push(msg);
  }
};
ws.onclose = () => { if (!shuttingDown) finish(1, 'CDP socket closed (renderer gone) — see events above'); };

const send = (method, params = {}, timeoutMs = 15000) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`timeout: ${method}`)); }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });

const evaluate = async (expression, timeoutMs = 15000) => {
  const r = await send('Runtime.evaluate', {
    expression, awaitPromise: true, returnByValue: true, userGesture: true,
  }, timeoutMs);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
};

await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `window.__cspViolations = [];
document.addEventListener('securitypolicyviolation', (e) => {
  window.__cspViolations.push({
    directive: e.violatedDirective, blockedURI: e.blockedURI, sample: (e.sample || '').slice(0, 300),
    sourceFile: e.sourceFile, line: e.lineNumber, column: e.columnNumber,
  });
});
window.__fnCalls = [];
const OrigFunction = window.Function;
window.Function = new Proxy(OrigFunction, {
  apply(target, thisArg, args) {
    window.__fnCalls.push({ kind: 'Function()', stack: new Error().stack });
    return Reflect.apply(target, thisArg, args);
  },
  construct(target, args) {
    window.__fnCalls.push({ kind: 'new Function()', stack: new Error().stack });
    return Reflect.construct(target, args);
  },
});
const origEval = window.eval;
window.eval = function (...args) {
  window.__fnCalls.push({ kind: 'eval()', stack: new Error().stack });
  return Reflect.apply(origEval, window, args);
};`,
});

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Network.enable');
await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });

// ------------------------------------------------------------------ run
const t0 = Date.now();
await send('Page.navigate', { url: `${origin}/#/bg-remover` });
for (let i = 0; i < 150; i++) {
  if (events.some((e) => e.method === 'Page.loadEventFired')) break;
  await sleep(100);
}
await sleep(1500);

const shell = await evaluate(`(() => ({
  title: document.title,
  lang: document.documentElement.lang,
  fileInputs: document.querySelectorAll('input[type=file]').length,
}))()`);
console.log('loaded:', JSON.stringify(shell));

const { root: docRoot } = await send('DOM.getDocument', { depth: -1 });
const { nodeId } = await send('DOM.querySelector', { nodeId: docRoot.nodeId, selector: 'input[type=file]' });
if (!nodeId) finish(1, 'no file input found');
await send('DOM.setFileInputFiles', { nodeId, files: [fixture] });
await sleep(1500);

const afterUpload = await evaluate(`(() => ({
  imgs: [...document.images].map(i => ({ alt: i.alt, w: i.naturalWidth, blob: i.src.startsWith('blob:') })),
  buttons: [...document.querySelectorAll('button')].map(b => b.innerText.trim()).filter(Boolean),
}))()`);
console.log('after upload:', JSON.stringify(afterUpload));
if (!afterUpload.imgs.some((i) => i.w > 0 && i.blob)) finish(1, 'preview did not render after upload');

const clicked = await evaluate(`(() => {
  const b = [...document.querySelectorAll('button')]
    .find(x => /(remove|borrar|移除|去除)[^]*?(background|fondo|背景)/i.test(x.innerText));
  if (!b) return 'not-found';
  b.click();
  return b.innerText.trim();
})()`);
console.log('clicked:', clicked);
if (clicked === 'not-found') finish(1, 'remove-background button not found');

// ------------------------------------------------------------------ progress (Node timer, not page polling)
const progress = setInterval(() => {
  const reqs = events.filter((e) => e.method === 'Network.requestWillBeSent');
  const modelReq = reqs.filter((e) => isModelUrl(e.params.request.url));
  const resp = events.filter((e) => e.method === 'Network.responseReceived')
    .filter((e) => isModelUrl(e.params.response.url));
  const lastReq = reqs[reqs.length - 1]?.params.request.url || '-';
  const errs = events.filter((e) => e.method === 'Runtime.exceptionThrown').length;
  console.log(`  … ${Math.round((Date.now() - t0) / 1000)}s | model reqs ${modelReq.length} / resp ${resp.length} | exceptions ${errs} | last: ${lastReq.slice(-60)}`);
}, 8000);

// ------------------------------------------------------------------ wait for the result
const deadline = Date.now() + MAX_MS;
let state = null;
let ready = false;
let cspHit = false;
while (Date.now() < deadline) {
  if (crashed) break;
  try {
    state = await evaluate(`(() => {
      const imgs = [...document.images].map(i => ({ alt: i.alt, w: i.naturalWidth, blob: i.src.startsWith('blob:') }));
      const texts = [...document.querySelectorAll('button, a')].map(e => e.innerText || '');
      return {
        imgs,
        body: document.body.innerText.slice(0, 200),
        downloadReady: texts.some(t => /download|descargar|下載|下载/i.test(t)),
      };
    })()`, 8000);
    const hasResultImg = state.imgs.some(
      (i) => i.blob && i.w > 1 && /result|resultado|結果|结果/i.test(i.alt),
    );
    ready = hasResultImg && state.downloadReady;
    if (ready) break;
    const viol = await evaluate('window.__cspViolations.length', 5000).catch(() => 0);
    if (viol > 0) { cspHit = true; break; }
  } catch (e) {
    if (crashed || /target|session|closed/i.test(e.message)) break;
  }
  await sleep(2000);
}
clearInterval(progress);

// ------------------------------------------------------------------ alpha check
// Read the produced PNG back in the page and look at the alpha channel: the
// corners must be transparent and the disc opaque.
const alphaStats = ready
  ? await evaluate(`(async () => {
      const img = [...document.images].find(i => i.src.startsWith('blob:') && /result|resultado|結果|结果/i.test(i.alt));
      if (!img) return { error: 'result image not found' };
      const bmp = await createImageBitmap(img);
      const c = document.createElement('canvas');
      c.width = bmp.width; c.height = bmp.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(bmp, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const avg = (x0, y0, x1, y1) => {
        let sum = 0, n = 0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { sum += d[(y * c.width + x) * 4 + 3]; n++; }
        return Math.round(sum / n);
      };
      const W = c.width, H = c.height, s = 30;
      return {
        w: W, h: H,
        corners: [avg(0, 0, s, s), avg(W - s, 0, W, s), avg(0, H - s, s, H), avg(W - s, H - s, W, H)],
        center: avg((W >> 1) - 40, (H >> 1) - 40, (W >> 1) + 40, (H >> 1) + 40),
      };
    })()`, 30000).catch((e) => ({ error: String(e.message || e) }))
  : { error: 'no result image' };
const alphaOk = !alphaStats.error && Math.max(...alphaStats.corners) <= 16 && alphaStats.center >= 235;

// ------------------------------------------------------------------ evidence
const urlFor = (id) => events.find((e) => e.method === 'Network.requestWillBeSent' && e.params.requestId === id)?.params.request.url || '?';
const modelResponses = events.filter((e) => e.method === 'Network.responseReceived')
  .filter((e) => isModelUrl(e.params.response.url))
  .map((e) => `${e.params.response.status} ${(e.params.response.url || '').split('/').pop().slice(0, 26)}`);
const failures = events.filter((e) => e.method === 'Network.loadingFailed')
  .map((e) => ({ url: urlFor(e.params.requestId), error: e.params.errorText, blocked: e.params.blockedReason }))
  .filter((f) => f.blocked || isModelUrl(f.url));
const consoleErrors = events.filter((e) => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error')
  .map((e) => e.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 1600));
const consoleErrorStacks = events.filter((e) => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error')
  .map((e) => (e.params.stackTrace?.callFrames || []).slice(0, 6)
    .map((f) => `${f.functionName || '(anon)'} @ ${(f.url || '').split('/').pop()}:${f.lineNumber}:${f.columnNumber}`));
const exceptions = events.filter((e) => e.method === 'Runtime.exceptionThrown')
  .map((e) => (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text).slice(0, 260));
const securityLogs = events.filter((e) => e.method === 'Log.entryAdded')
  .map((e) => e.params.entry)
  .filter((l) => l.source === 'security' || /content security policy|refused to/i.test(l.text))
  .map((l) => l.text.slice(0, 220));
const cspBlocked = failures.filter((f) => f.blocked || /csp|blocked/i.test(f.error));
const result = (state?.imgs || []).filter((i) => i.blob && i.w > 1);
const ok = ready && alphaOk && securityLogs.length === 0 && cspBlocked.length === 0 && exceptions.length === 0;

console.log('\n──────── result ────────');
console.log('elapsed:', ((Date.now() - t0) / 1000).toFixed(1) + 's');
console.log('model responses:', modelResponses.length, modelResponses.slice(0, 5));
console.log('blocked / failed requests:', failures.slice(0, 6));
console.log('CSP violations:', securityLogs.slice(0, 5));
const pageViolations = await evaluate('window.__cspViolations', 8000).catch(() => []);
console.log('securitypolicyviolation samples:', JSON.stringify(pageViolations, null, 1));
const fnCalls = await evaluate('(window.__fnCalls || []).slice(0, 3)', 8000).catch(() => []);
console.log('dynamic-code calls:', JSON.stringify(fnCalls, null, 1));
console.log('console errors:', consoleErrors.slice(0, 5));
console.log('console stacks:', JSON.stringify(consoleErrorStacks.slice(0, 3), null, 1));
console.log('page exceptions:', exceptions.slice(0, 3));
console.log('renderer crashed:', crashed ? 'yes' : 'no');
console.log('alpha (0=transparent, 255=opaque):', JSON.stringify(alphaStats));
console.log('images at end:', state?.imgs);
console.log('page text:', state?.body);
console.log(ok ? '\nPASS  background removal completed under the production CSP (corners transparent, subject opaque)'
  : '\nFAIL  background removal did not complete — see evidence above');

finish(ok ? 0 : 1);