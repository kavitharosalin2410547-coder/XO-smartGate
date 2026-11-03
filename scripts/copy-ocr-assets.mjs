// Copies the OCR engine files out of node_modules into public/ocr so the app
// serves them itself (same origin) and the service worker can cache them.
// Without this, tesseract.js would download them from a CDN at runtime,
// which would not work offline.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dest = join(root, "public", "ocr");
mkdirSync(join(dest, "core"), { recursive: true });
mkdirSync(join(dest, "lang"), { recursive: true });

const jobs = [
  // web worker that runs the OCR
  ["node_modules/tesseract.js/dist/worker.min.js", "worker.min.js"],
  // WebAssembly core: SIMD build (fast, most devices) and plain fallback.
  // We only use the LSTM engine, so the "-lstm" builds are enough.
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "core/tesseract-core-simd-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js", "core/tesseract-core-lstm.wasm.js"],
  // English language data (letters + digits are all a plate needs)
  ["node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "lang/eng.traineddata.gz"],
];

let missing = 0;
for (const [from, to] of jobs) {
  const src = join(root, from);
  if (!existsSync(src)) {
    console.warn(`[ocr-assets] missing ${from}`);
    missing++;
    continue;
  }
  copyFileSync(src, join(dest, to));
}

if (missing) {
  console.warn(`[ocr-assets] ${missing} file(s) missing; run "npm install" and try again.`);
} else {
  console.log("[ocr-assets] copied OCR engine files to public/ocr");
}
