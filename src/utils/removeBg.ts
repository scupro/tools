// The package's ambient declarations live in `types.d.ts`, which TypeScript
// only loads once the root module is referenced. The `/wasm` entry point is
// identical at runtime but ships without the WebGL/WebGPU backends (400 KB
// -> 46 KB), so we import the values from there and take the types from root.
import type {} from 'onnxruntime-web';
import * as ort from 'onnxruntime-web/wasm';

/**
 * Background removal on the device, without any AGPL / non-commercial code.
 *
 * Model: IS-Net general use (Dichotomous Image Segmentation), converted to
 * ONNX and published as Apache-2.0 by the Hugging Face repo
 * `techycoder/isnet-background-removal`. Apache-2.0 permits commercial use.
 * Inference runs locally with onnxruntime-web (MIT) — no image ever leaves
 * the browser.
 */
export const BG_MODEL_URL =
  'https://huggingface.co/techycoder/isnet-background-removal/resolve/main/model_fp16.onnx';

/** The model has a fixed 1024x1024 input. */
const MATTE_SIZE = 1024;

let sessionPromise: Promise<ort.InferenceSession> | null = null;

function getSession(): Promise<ort.InferenceSession> {
  if (sessionPromise) return sessionPromise;

  // Runtime files are self-hosted under /ort/ (see scripts/copy-ort-assets.mjs).
  ort.env.wasm.wasmPaths = '/ort/';
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.simd = true;

  const loading = ort.InferenceSession.create(BG_MODEL_URL, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  }).catch((error: unknown) => {
    // Allow a retry after a network failure instead of caching the rejection.
    sessionPromise = null;
    throw error;
  });

  sessionPromise = loading;
  return loading;
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Chroma-plane conversion: HWC RGBA bytes -> CHW floats normalised to [-0.5, 0.5]. */
function toInputTensor(data: Uint8ClampedArray): Float32Array {
  const plane = MATTE_SIZE * MATTE_SIZE;
  const input = new Float32Array(plane * 3);
  for (let i = 0, p = 0; i < plane; i++, p += 4) {
    input[i] = data[p] / 255 - 0.5;
    input[plane + i] = data[p + 1] / 255 - 0.5;
    input[plane * 2 + i] = data[p + 2] / 255 - 0.5;
  }
  return input;
}

export interface RemovalProgress {
  /** 0..1 completed fraction of the current step. */
  value: number;
  message: string;
}

/**
 * Removes the background of an image and returns a transparent PNG.
 * The matte is computed at 1024x1024 and upscaled to the original size.
 */
export async function removeBackground(
  file: Blob,
  onProgress?: (progress: RemovalProgress) => void,
): Promise<Blob> {
  onProgress?.({ value: 0.05, message: 'decode' });

  const bitmap = await createImageBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;
  if (!width || !height) {
    bitmap.close();
    throw new Error('Empty image');
  }

  // 1. Model input: the full frame squashed to 1024x1024.
  const sourceCanvas = createCanvas(MATTE_SIZE, MATTE_SIZE);
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceCtx) throw new Error('Canvas 2D context unavailable');
  sourceCtx.drawImage(bitmap, 0, 0, MATTE_SIZE, MATTE_SIZE);
  const input = toInputTensor(sourceCtx.getImageData(0, 0, MATTE_SIZE, MATTE_SIZE).data);
  onProgress?.({ value: 0.2, message: 'model' });

  // 2. Inference (the model already returns a 0..1 alpha matte).
  const session = await getSession();
  const feeds = {
    [session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, MATTE_SIZE, MATTE_SIZE]),
  };
  const output = await session.run(feeds);
  const matteTensor = output[session.outputNames[0]];
  const matte = matteTensor.data as Float32Array;
  onProgress?.({ value: 0.85, message: 'compose' });

  // 3. Paint the matte as an alpha mask, then let the browser scale it back.
  const matteCanvas = createCanvas(MATTE_SIZE, MATTE_SIZE);
  const matteCtx = matteCanvas.getContext('2d');
  if (!matteCtx) throw new Error('Canvas 2D context unavailable');
  const matteImage = matteCtx.createImageData(MATTE_SIZE, MATTE_SIZE);
  for (let i = 0; i < matte.length; i++) {
    const v = matte[i];
    matteImage.data[i * 4 + 3] = v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255);
  }
  matteCtx.putImageData(matteImage, 0, 0);

  const alphaCanvas = createCanvas(width, height);
  const alphaCtx = alphaCanvas.getContext('2d', { willReadFrequently: true });
  if (!alphaCtx) throw new Error('Canvas 2D context unavailable');
  alphaCtx.imageSmoothingEnabled = true;
  alphaCtx.imageSmoothingQuality = 'high';
  alphaCtx.drawImage(matteCanvas, 0, 0, width, height);
  const alpha = alphaCtx.getImageData(0, 0, width, height).data;

  // 4. Keep the original pixels, replace only their alpha channel.
  const outCanvas = createCanvas(width, height);
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!outCtx) throw new Error('Canvas 2D context unavailable');
  outCtx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const outImage = outCtx.getImageData(0, 0, width, height);
  for (let i = 3; i < outImage.data.length; i += 4) {
    outImage.data[i] = alpha[i];
  }
  outCtx.putImageData(outImage, 0, 0);
  onProgress?.({ value: 0.95, message: 'encode' });

  const blob = await new Promise<Blob | null>((resolve) =>
    outCanvas.toBlob(resolve, 'image/png'),
  );
  if (!blob) throw new Error('PNG encoding failed');
  onProgress?.({ value: 1, message: 'done' });
  return blob;
}