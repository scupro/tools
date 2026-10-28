import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Copies the ONNX Runtime WASM runtime into `public/ort/` so the app
 * self-hosts it: the CSP does not need a third-party script origin and the
 * files are served with the rest of the site.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'node_modules', 'onnxruntime-web', 'dist');
const outDir = join(root, 'public', 'ort');
const files = ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];

if (!existsSync(srcDir)) {
  console.error(`[copy-ort] onnxruntime-web not installed (${srcDir} missing). Run npm install first.`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
for (const file of files) {
  const from = join(srcDir, file);
  if (!existsSync(from)) {
    console.error(`[copy-ort] missing ${from}`);
    process.exit(1);
  }
  copyFileSync(from, join(outDir, file));
}
console.log(`[copy-ort] copied ${files.length} files to public/ort/`);