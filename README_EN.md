<h1 align="center">Dogbro Tools</h1>

<p align="center">
  <strong>Utilities for images, PDF, data and networking. Everything runs on your device — no file is ever uploaded.</strong><br/>
  <em>Client-side utilities for images, PDFs, data and networking. Nothing leaves your browser.</em>
</p>

<p align="center">
  <a href="https://dogbro.store"><b>dogbro.store</b></a> ·
  <a href="README.md">正體中文</a> ·
  <a href="CHANGELOG.md">Changelog</a> ·
  <a href="LICENSE">MIT license</a>
</p>

<p align="center">
  <img alt="MIT" src="https://img.shields.io/badge/license-MIT-10B981" />
  <img alt="Cloudflare" src="https://img.shields.io/badge/deploy-Cloudflare-F38020?logo=cloudflare&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React%2019-Vite%20%2B%20Tailwind%204-111827" />
  <img alt="PWA" src="https://img.shields.io/badge/PWA-offline-047857" />
</p>

---

## What this is

A single-page, front-end-only app that bundles 15 everyday utilities: background removal, image conversion, PDF merging, document scanning, signatures, data redaction, hashing, JWT, JSON, UUID, epoch conversion, subnet maths and Web3 helpers. Everything is computed in memory with native browser APIs (Canvas, Web Crypto, WebAssembly, Web Speech). No backend, no database, no telemetry.

The UI ships in **Traditional Chinese, English and Spanish** (switchable in the navbar, stored in `localStorage`) with light and dark themes. Every tool has its own `#/` route, so links survive reloads and can be shared.

## Tools

| Category | Tools |
|---|---|
| **Image** | Remove background (IS-Net ONNX model + `onnxruntime-web`, model runs in the browser), enhance photo, convert & compress, magnifier, redact ID numbers and faces, transparent signature |
| **PDF / docs** | Merge PDFs (`pdf-lib`, `pdfjs-dist`), scan with the camera to PDF, read text aloud |
| **Security** | Hashes (SHA-256 / SHA-512 / Keccak-256 / MD5), JWT decoder, Base64, passphrase generator (`crypto.getRandomValues`) |
| **Data / text** | JSON formatter and minifier, UUID v4 / NanoID, Unix timestamp conversion |
| **Network** | IPv4 subnet and CIDR calculator with wildcard mask |
| **Web3** | EVM / Solana address validation, Keccak-256, Wei / Gwei conversion |

- Full-text search, category filters and a `Ctrl/Cmd + K` command palette.
- PWA: installable and offline-capable (Workbox precache).
- Shareable hash routes: `#/bg-remover`, `#/pdf`, `#/json`…

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS 4 · lucide-react |
| Processing | Browser APIs (Canvas, Web Crypto, Web Speech) plus WebAssembly / ONNX Runtime |
| Hosting | Static hosting (Cloudflare Pages or Workers static assets), no Functions |
| PWA | `vite-plugin-pwa` (Workbox `generateSW`) |

## Project layout

```
src/App.tsx              tool catalogue, search, hash routing
src/components/layout/   Navbar, Footer, Layout, Logo (brand mark)
src/components/tools/    one file per tool (BackgroundRemover, PdfManager, …)
src/components/ui/       command palette and shared primitives
src/utils/i18n.ts        three-language dictionary (ES / EN / ZH) + fmt() placeholders
src/utils/               crypto, image, pdf, compress, md5
public/                  _headers (CSP), icons, robots.txt; favicon.svg is the icon master
tests/                   verify.mjs (static checks), e2e-bg-removal.mjs (browser E2E)
```

## Security and privacy

- **Everything is local.** Images, PDFs, keys and IP addresses stay in memory; there is no upload endpoint.
- **The only third-party connection** is the background-removal model: on first use the browser fetches the IS-Net fp16 ONNX (~90 MB) from `huggingface.co`, which the HTTP cache then keeps. The ONNX Runtime WASM (~12 MB) is self-hosted at `/ort/` (`prebuild` copies it out of `node_modules`), so no CDN is contacted.
- **CSP** (`public/_headers`): `default-src 'self'`, `connect-src` limited to the app's own origin, `huggingface.co` / `*.hf.co` (model file and its download redirect) and Cloudflare Insights, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, HSTS, `nosniff`, Referrer-Policy and a Permissions-Policy that only grants the camera to the scanner.
- **No `'unsafe-eval'` and no `'unsafe-inline'`.** The removal pipeline (`src/utils/removeBg.ts`) only uses the `onnxruntime-web` WASM backend, so nothing needs `new Function()` or `eval()` and `script-src` only needs `'wasm-unsafe-eval'`. `tests/e2e-bg-removal.mjs` performs a real removal under the production CSP, asserts the page never calls `Function()` or `eval()`, and checks the resulting alpha channel: transparent corners, opaque subject.
- **Licences: commercially usable.** The previous `@imgly/background-removal` package is **AGPL-3.0**, which would put the entire frontend under AGPL (network clause included) — it has been removed. The current stack is:
  - model: [`techycoder/isnet-background-removal`](https://huggingface.co/techycoder/isnet-background-removal) (IS-Net / DIS, **Apache-2.0**);
  - inference: `onnxruntime-web` (**MIT**).
  - Non-commercial models such as BRIA RMBG-1.4 (CC BY-NC 4.0) are deliberately not used. To swap models, point `BG_MODEL_URL` in `src/utils/removeBg.ts` at any ONNX model taking 1×3×1024×1024 and returning a 0–1 alpha matte.

## Local development

Requires **Node.js ≥ 20.19** (22 recommended) and npm.

```bash
git clone https://github.com/scupro/tools.git
cd tools
npm install
npm run dev        # http://localhost:5173
npm run lint       # oxlint
npm run build      # prebuild copies ORT WASM → tsc -b && vite build → dist/
npm run preview    # build, then serve locally with wrangler dev (applies _headers)
node scripts/make-icons.mjs  # redraw favicon.ico and the PNG set from public/favicon.svg (needs local chromium; manual step)
```

## Tests

```bash
npm test          # static: i18n key/placeholder parity, Traditional-Chinese check, branding, no-eval CSP, no AGPL dependency
npm run test:e2e  # E2E: headless Chromium loads dist/ under the production CSP and performs a real background removal
```

`npm test` relies on `node --experimental-strip-types` (built into Node 22; the npm script passes the flag). `npm run test:e2e` downloads the ~95 MB model, takes roughly 45–300 s locally, needs `npm run build` first and requires `chromium` on the machine.

## Deploying to Cloudflare

Cloudflare's static asset service applies `_headers`, so the CSP is honoured on both Pages and Workers. **The repo binds no domain**: custom domains are configured in the Cloudflare dashboard and are unrelated to the code. The `dogbro.store` link in the footer is just a website link.

### Option A — Cloudflare dashboard (Git-connected builds)

1. Push the project to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Dogbro Tools"
   git branch -M main
   git remote add origin https://github.com/scupro/tools.git
   git push -u origin main
   ```
2. Open the [Cloudflare dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Authorise GitHub and pick `scupro/tools` plus the branch to deploy (`main`).
4. Build settings:
   - Framework preset: **None** (do not pick a React/CRA preset)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable (optional): `NODE_VERSION = 22`
5. **Save and Deploy**. The first build takes 1–2 minutes and yields a `https://tools.pages.dev`-style URL.
6. Every later push to `main` rebuilds automatically; other branches produce preview deployments.
7. To change the domain, use the project's **Custom domains** tab (out of scope here).

> The app uses `#/` hash routing, so every page is served from `/` and no `_redirects` file is needed — reloading a deep link on Pages will not 404.

### Option B — wrangler CLI

```bash
npx wrangler login           # opens the browser to authorise your account
npm run build

# Deploy to a Pages project (recommended; pick any --project-name, "tools" here)
npx wrangler pages deploy dist --project-name tools --branch main

# Or deploy as Workers static assets (uses the assets block in wrangler.json)
npx wrangler deploy          # same as npm run deploy (builds first)
```

- `npm run deploy` = `npm run build && wrangler deploy`, driven by `wrangler.json`: `name: "tools"`, `assets.directory: "./dist"`, `not_found_handling: "single-page-application"`. That creates a Worker named `tools` at `https://tools.<your-subdomain>.workers.dev`.
- For CI or non-interactive shells, use an API token instead of `login`: `CLOUDFLARE_API_TOKEN=... npx wrangler pages deploy dist --project-name tools`. The token needs `Cloudflare Pages:Edit` (Pages) or `Workers Scripts:Edit` (Workers).
- Check what is live with `npx wrangler pages deployment list --project-name tools` or the dashboard's Deployments tab.
- Confirm the headers survived the upload: `curl -sI https://<your-url>/ | grep -i content-security-policy`.

## License

[MIT](LICENSE) © 2026 ATM Software Labs · Alberto Trujillo Mingorance.
This is a derivative work: branding, the three-language UI (Traditional Chinese / English / Spanish) and the deployment setup were modified by Dogbro LLC; those changes © 2026 Dogbro LLC.

<p align="center"><sub>© 2026 Dogbro LLC · <a href="https://dogbro.store">dogbro.store</a></sub></p>