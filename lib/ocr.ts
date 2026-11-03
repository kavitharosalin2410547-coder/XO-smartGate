// Offline number-plate reading with Tesseract (WebAssembly). The engine, worker
// and English data are all served from /ocr by this app and cached by the
// service worker, so scanning works with no network.
import { extractPlateCandidates, type PlateMatch } from "./plate";

type Progress = (percent: number, label: string) => void;

let workerPromise: Promise<any> | null = null;
let onProgress: Progress | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const origin = window.location.origin;
      const worker = await createWorker("eng", 1, {
        workerPath: `${origin}/ocr/worker.min.js`,
        corePath: `${origin}/ocr/core`,
        langPath: `${origin}/ocr/lang`,
        gzip: true,
        workerBlobURL: false,
        cacheMethod: "none", // our service worker already caches the files
        logger: (m: { status: string; progress: number }) => {
          if (onProgress) onProgress(Math.round(m.progress * 100), m.status);
        },
      });
      return worker;
    })().catch((e) => {
      workerPromise = null;
      throw e;
    });
  }
  return workerPromise;
}

/** Shrink, grey-scale and stretch contrast: helps Tesseract on phone photos. */
async function preprocess(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  let lo = 255;
  let hi = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    d[i] = d[i + 1] = d[i + 2] = g;
    if (g < lo) lo = g;
    if (g > hi) hi = g;
  }
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    const v = ((d[i] - lo) * 255) / range;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  bitmap.close?.();
  return canvas;
}

export interface ScanResult {
  text: string;
  candidates: PlateMatch[];
}

export async function scanPlate(file: File, progress?: Progress): Promise<ScanResult> {
  onProgress = progress ?? null;
  progress?.(0, "Loading reader");
  const worker = await getWorker();
  const canvas = await preprocess(file);

  const whitelist = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let text = "";
  let candidates: PlateMatch[] = [];

  // Pass 1: treat the picture as one block of text. Pass 2: scattered text.
  for (const psm of ["6", "11"]) {
    await worker.setParameters({ tessedit_char_whitelist: whitelist, tessedit_pageseg_mode: psm });
    const { data } = await worker.recognize(canvas);
    text += "\n" + data.text;
    candidates = extractPlateCandidates(text);
    if (candidates.some((c) => c.validState)) break;
  }

  onProgress = null;
  return { text: text.trim(), candidates };
}
