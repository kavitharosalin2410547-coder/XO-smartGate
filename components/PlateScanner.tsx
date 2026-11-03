"use client";

import { useRef, useState } from "react";
import { scanPlate } from "@/lib/ocr";
import { formatPlate, type PlateMatch } from "@/lib/plate";
import { IconCamera } from "./icons";

interface Props {
  onPick: (plate: string) => void;
  label?: string;
}

// Take or choose a photo of the number plate, read it offline, and let the
// user tap the correct reading. OCR can be wrong, so the user always confirms.
export default function PlateScanner({ onPick, label = "Scan plate" }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<PlateMatch[] | null>(null);
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBusy(true);
    setError("");
    setResults(null);
    setProgress(0);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));

    try {
      const res = await scanPlate(file, (p, s) => {
        setProgress(p);
        setStatus(s);
      });
      setResults(res.candidates);
    } catch (err) {
      console.error(err);
      setError("Could not read the picture. Try again, or type the number by hand.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="scanner">
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <button type="button" className="btn secondary" onClick={() => input.current?.click()} disabled={busy}>
        <IconCamera size={18} /> {busy ? "Reading…" : label}
      </button>

      {busy && (
        <div className="progress" role="progressbar" aria-valuenow={progress} aria-label="Reading plate">
          <div style={{ width: `${progress}%` }} />
          <small>{status}</small>
        </div>
      )}

      {preview && !busy && (results || error) && <img className="preview" src={preview} alt="Plate photo" />}

      {results && results.length > 0 && (
        <div>
          <p className="muted small-gap">Tap the correct reading:</p>
          <div className="chips">
            {results.map((r) => (
              <button
                type="button"
                key={r.plate}
                className="chip"
                onClick={() => {
                  onPick(r.plate);
                  setResults(null);
                  setPreview(null);
                }}
              >
                {formatPlate(r.plate)}
              </button>
            ))}
          </div>
        </div>
      )}

      {results && results.length === 0 && (
        <p className="muted">No plate found. Get closer so the plate fills the photo, avoid glare, then try again.</p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
