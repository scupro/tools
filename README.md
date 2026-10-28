<h1 align="center">Dogbro Tools</h1>

<p align="center">
  <strong>處理圖片、PDF、資料與網路的線上工具。全部在你的裝置上完成，檔案不會上傳到任何伺服器。</strong><br/>
  <em>Client-side utilities for images, PDFs, data and networking. Nothing leaves your browser.</em>
</p>

<p align="center">
  <a href="https://dogbro.store"><b>dogbro.store</b></a> ·
  <a href="README_EN.md">English</a> ·
  <a href="CHANGELOG.md">更新記錄</a> ·
  <a href="LICENSE">MIT 授權</a>
</p>

<p align="center">
  <img alt="授權 MIT" src="https://img.shields.io/badge/license-MIT-10B981" />
  <img alt="Cloudflare" src="https://img.shields.io/badge/deploy-Cloudflare-F38020?logo=cloudflare&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React%2019-Vite%20%2B%20Tailwind%204-111827" />
  <img alt="PWA" src="https://img.shields.io/badge/PWA-offline-047857" />
</p>

---

## 這是什麼

一個純前端的單頁應用程式（SPA），把 15 個日常小工具放在同一個介面裡：去背、轉檔、PDF 合併、掃描、簽名、遮蔽個資、雜湊、JWT、JSON、UUID、Epoch 換算、子網路計算、Web3 位址檢查……全部用瀏覽器原生 API（Canvas、Web Crypto、WebAssembly、Web Speech）在記憶體中完成。沒有後端、沒有資料庫、沒有追蹤碼。

介面支援 **正體中文、English、Español** 三種語言（可在導覽列切換，選擇會存在 `localStorage`），並有亮／暗主題。每個工具都有獨立的 `#/` 路由，可以直接分享或重新載入。

## 功能

| 分類 | 工具 |
|---|---|
| **影像** | 去背（IS-Net ONNX 模型＋`onnxruntime-web`，模型在瀏覽器內執行）、照片增強、轉檔與壓縮、放大鏡、遮蔽證件號碼與臉部、建立去背簽名 |
| **PDF／文件** | 合併多份 PDF（`pdf-lib`、`pdfjs-dist`）、用相機掃描成 PDF、文字朗讀 |
| **安全** | 雜湊（SHA-256／SHA-512／Keccak-256／MD5）、JWT 解析、Base64、密碼短語產生（`crypto.getRandomValues`） |
| **資料／文字** | JSON 格式化與壓縮、UUID v4／NanoID、Unix 時間戳換算 |
| **網路** | IPv4 子網路與 CIDR 計算（含 wildcard mask） |
| **Web3** | EVM／Solana 位址檢查、Keccak-256、Wei／Gwei 換算 |

- 全文搜尋與分類篩選，`Ctrl/Cmd + K` 開啟指令面板。
- PWA：可安裝，離線可用（Workbox 預先快取）。
- 可分享的雜湊路由：`#/bg-remover`、`#/pdf`、`#/json`…

## 技術棧

| 層 | 技術 |
|---|---|
| 前端 | React 19 · TypeScript · Vite · Tailwind CSS 4 · lucide-react |
| 處理 | 瀏覽器 API（Canvas、Web Crypto、Web Speech）與 WebAssembly／ONNX Runtime |
| 部署 | 靜態託管（Cloudflare Pages 或 Workers 靜態資產），無 Functions、無後端 |
| PWA | `vite-plugin-pwa`（Workbox `generateSW`） |

## 專案結構

```
src/App.tsx              工具目錄、搜尋、雜湊路由
src/components/layout/   Navbar、Footer、Layout、Logo（品牌圖示）
src/components/tools/    一個工具一個檔案（BackgroundRemover、PdfManager…）
src/components/ui/       指令面板與共用元件
src/utils/i18n.ts        三語字典（ES／EN／ZH）＋ fmt() 佔位符替換
src/utils/               crypto、image、pdf、compress、md5
public/                  _headers（CSP）、圖示、robots.txt；favicon.svg 是圖示母檔
tests/                   verify.mjs（靜態檢查）、e2e-bg-removal.mjs（瀏覽器端到端）
```

## 安全性與隱私

- **全部在本機處理。** 圖片、PDF、金鑰、IP 位址都只存在記憶體中，沒有任何上傳端點。
- **唯一的第三方連線**是去背模型：第一次使用時從 `huggingface.co` 下載 IS-Net 的 fp16 ONNX（約 90 MB），之後由瀏覽器（HTTP）快取。ONNX Runtime 的 WASM（約 12 MB）由本站自行提供（`/ort/`，由 `prebuild` 從 `node_modules` 複製），不連任何 CDN。
- **CSP**（`public/_headers`）：`default-src 'self'`、`connect-src` 僅允許自家網域、`huggingface.co`／`*.hf.co`（模型本體與其下載重新導向）與 Cloudflare Insights、`frame-ancestors 'none'`、`X-Frame-Options: DENY`、HSTS、`nosniff`、Referrer-Policy、Permissions-Policy（相機僅供掃描器使用）。
- **沒有 `'unsafe-eval'`，也沒有 `'unsafe-inline'`。** 去背管線（`src/utils/removeBg.ts`）只用 `onnxruntime-web` 的 WASM 後端，不需要任何 `new Function()` 或 `eval()`，所以 `script-src` 只需要 `'wasm-unsafe-eval'`。`tests/e2e-bg-removal.mjs` 會在正式 CSP 下實跑一次去背，同時檢查頁面完全沒有呼叫 `Function()`／`eval()`，並驗證輸出的 alpha：四角必須透明、主體必須不透明。
- **授權：可商用。** 舊版使用的 `@imgly/background-removal` 是 **AGPL-3.0**，打包進網站會讓整個前端受 AGPL（含網路使用條款）拘束，因此已移除。現在的組合是：
  - 模型：[`techycoder/isnet-background-removal`](https://huggingface.co/techycoder/isnet-background-removal)（IS-Net／DIS，**Apache-2.0**）；
  - 推論引擎：`onnxruntime-web`（**MIT**）。
  - 未採用 BRIA 的 RMBG-1.4（CC BY-NC 4.0）等禁止商用的模型。若要換模型，只要模型回傳 0–1 的 alpha、輸入為 1×3×1024×1024，改 `src/utils/removeBg.ts` 的 `BG_MODEL_URL` 即可。

## 本機開發

需求：**Node.js ≥ 20.19**（建議 22）與 npm。

```bash
git clone https://github.com/scupro/tools.git
cd tools
npm install
npm run dev        # http://localhost:5173
npm run lint       # oxlint
npm run build      # prebuild 複製 ORT WASM → tsc -b && vite build → dist/
npm run preview    # 建置後用 wrangler dev 起本機伺服器（會套用 _headers）
node scripts/make-icons.mjs  # 由 public/favicon.svg 重繪 favicon.ico 與各尺寸 PNG（需本機 chromium；手動執行）
```

## 測試

```bash
npm test          # 靜態檢查：三語鍵值/佔位符一致、正體中文無簡體字、品牌字串、CSP 無 eval、無 AGPL 依賴
npm run test:e2e  # 端到端：headless Chromium 載入 dist/，套用正式 CSP，實際跑一次去背
```

`npm test` 需要 `node --experimental-strip-types`（Node 22 內建；npm script 已帶上參數）。`npm run test:e2e` 會連外下載模型（約 95 MB），本機約需 45～300 秒，需要先 `npm run build`，並且系統要有 `chromium`。

## 部署到 Cloudflare

`_headers` 會被 Cloudflare 的靜態資產服務套用，所以不論走 Pages 或 Workers，CSP 都會生效。**本專案不綁定任何網域**：自訂網域是在 Cloudflare 後台設定，與程式碼無關；頁尾的 `dogbro.store` 只是網站連結。

### 方法 A：Cloudflare Dashboard（含 Git 自動部署）

1. 把專案推上 GitHub：
   ```bash
   git init
   git add .
   git commit -m "Dogbro Tools"
   git branch -M main
   git remote add origin https://github.com/scupro/tools.git
   git push -u origin main
   ```
2. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
3. 授權 GitHub，選擇 `scupro/tools` 與要部署的分支（`main`）。
4. 建置設定：
   - Framework preset：**None**（不要選 Create React App 之類的預設）
   - Build command：`npm run build`
   - Build output directory：`dist`
   - 環境變數（選用）：`NODE_VERSION = 22`
5. **Save and Deploy**。第一次建置約 1～2 分鐘，完成後會拿到 `https://tools.pages.dev` 之類的網址。
6. 之後每次 push 到 `main` 都會自動重新建置；其他分支會產生預覽網址（Preview deployments）。
7. 要換網域時，在該 Pages 專案的 **Custom domains** 分頁設定即可（本次不處理）。

> 本專案使用 `#/` 雜湊路由，所有頁面實際上都從 `/` 載入，因此不需要 `_redirects`；在 Pages 上直接重新整理深層網址也不會 404。

### 方法 B：wrangler CLI

```bash
npx wrangler login           # 開瀏覽器授權 Cloudflare 帳號
npm run build

# 部署到 Pages 專案（建議；--project-name 可自訂，這裡用 tools）
npx wrangler pages deploy dist --project-name tools --branch main

# 或：部署成 Workers 靜態資產（使用 wrangler.json 的 assets 設定）
npx wrangler deploy          # 等同 npm run deploy（會先 build）
```

- `npm run deploy` = `npm run build && wrangler deploy`，讀取 `wrangler.json`：`name: "tools"`、`assets.directory: "./dist"`、`not_found_handling: "single-page-application"`。這會建立一個名為 `tools` 的 Worker（`https://tools.<你的子網域>.workers.dev`）。
- 首次在 CI 或無互動環境執行時，改用 API Token：`CLOUDFLARE_API_TOKEN=... npx wrangler pages deploy dist --project-name tools`。Token 需要 `Cloudflare Pages:Edit`（Pages）或 `Workers Scripts:Edit`（Workers）權限。
- 部署後用 `npx wrangler pages deployment list --project-name tools` 或 Dashboard 的 Deployments 分頁確認版本。
- 佈署完可以用 `curl -sI https://<你的網址>/ | grep -i content-security-policy` 確認 `_headers` 有被套用。

## 授權

[MIT](LICENSE) © 2026 ATM Software Labs · Alberto Trujillo Mingorance。
本專案為其衍生版本，品牌、三語介面（正體中文／English／Español）與部署設定由 Dogbro LLC 修改，修改部分 © 2026 Dogbro LLC。

<p align="center"><sub>© 2026 Dogbro LLC · <a href="https://dogbro.store">dogbro.store</a></sub></p>