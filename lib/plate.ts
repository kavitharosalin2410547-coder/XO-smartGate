// Number plate helpers. Written without imports so it can also be unit-tested
// directly with `node --test`.
//
// Indian plates look like  TN 09 AB 1234  (state, district, series, number).
// OCR often confuses look-alike characters (O/0, I/1, S/5, B/8...), so we use
// the known pattern to put the right kind of character in each position.

export const STATE_CODES = new Set([
  "AN", "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "DN", "GA", "GJ", "HP",
  "HR", "JH", "JK", "KA", "KL", "LA", "LD", "MH", "ML", "MN", "MP", "MZ", "NL",
  "OD", "OR", "PB", "PY", "RJ", "SK", "TN", "TR", "TS", "UK", "UP", "WB",
]);

const TO_LETTER: Record<string, string> = { "0": "O", "1": "I", "2": "Z", "5": "S", "6": "G", "8": "B" };
const TO_DIGIT: Record<string, string> = { O: "0", Q: "0", D: "0", I: "1", L: "1", Z: "2", S: "5", G: "6", B: "8" };

export interface PlateMatch {
  plate: string; // normalised: upper case, no spaces
  fixes: number; // how many look-alike characters were corrected
  validState: boolean; // first two letters are a real Indian state/UT code
}

/** Upper-case and strip everything except letters and digits. */
export function cleanPlate(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function fix(s: string, map: Record<string, string>, wantLetters: boolean): { out: string; fixes: number } | null {
  let out = "";
  let fixes = 0;
  for (const c of s) {
    const isLetter = c >= "A" && c <= "Z";
    const isDigit = c >= "0" && c <= "9";
    if (wantLetters ? isLetter : isDigit) {
      out += c;
    } else if (map[c]) {
      out += map[c];
      fixes++;
    } else {
      return null;
    }
  }
  return { out, fixes };
}

/** Try to read a cleaned string as SS DD L(L)(L) NNNN, correcting look-alikes. */
export function parseIndianPlate(s: string): PlateMatch | null {
  if (s.length < 8 || s.length > 11) return null;
  const state = fix(s.slice(0, 2), TO_LETTER, true);
  const number = fix(s.slice(-4), TO_DIGIT, false);
  if (!state || !number) return null;

  const mid = s.slice(2, -4); // district digits + series letters
  let best: PlateMatch | null = null;
  for (const districtLen of [2, 1]) {
    const seriesLen = mid.length - districtLen;
    if (seriesLen < 1 || seriesLen > 3) continue;
    const district = fix(mid.slice(0, districtLen), TO_DIGIT, false);
    const series = fix(mid.slice(districtLen), TO_LETTER, true);
    if (!district || !series) continue;
    const candidate: PlateMatch = {
      plate: state.out + district.out + series.out + number.out,
      fixes: state.fixes + district.fixes + series.fixes + number.fixes,
      validState: STATE_CODES.has(state.out),
    };
    if (!best || candidate.fixes < best.fixes) best = candidate;
  }
  return best;
}

const BH_SERIES = /^\d{2}BH\d{4}[A-Z]{1,2}$/;

// Letter pairs that OCR commonly swaps. Swapping one of these is a cheap fix;
// any other single-letter change to reach a valid state code costs more.
const LOOK_ALIKE_PAIRS = ["IT", "MN", "DO", "CG", "UV", "KR", "HN", "EF", "PR"];
function isLookAlike(a: string, b: string) {
  return LOOK_ALIKE_PAIRS.some((p) => (p[0] === a && p[1] === b) || (p[1] === a && p[0] === b));
}

/** Valid state codes that differ from `code` by exactly one letter. */
function repairState(code: string): { code: string; cost: number }[] {
  const out: { code: string; cost: number }[] = [];
  for (const valid of STATE_CODES) {
    const diff = [0, 1].filter((i) => valid[i] !== code[i]);
    if (diff.length !== 1) continue;
    const i = diff[0];
    out.push({ code: valid, cost: isLookAlike(valid[i], code[i]) ? 0.5 : 1.5 });
  }
  return out;
}

/** Pull likely plate numbers out of raw OCR text, best guess first. */
export function extractPlateCandidates(text: string): PlateMatch[] {
  const found = new Map<string, PlateMatch>();
  const chunks = [text, ...text.split(/\n+/)];

  for (const chunk of chunks) {
    const s = cleanPlate(chunk);
    for (let len = 8; len <= 11; len++) {
      for (let i = 0; i + len <= s.length; i++) {
        const sub = s.slice(i, i + len);
        const m = parseIndianPlate(sub);
        if (m && m.validState) {
          const prev = found.get(m.plate);
          if (!prev || m.fixes < prev.fixes) found.set(m.plate, m);
        }
        if (BH_SERIES.test(sub)) found.set(sub, { plate: sub, fixes: 0, validState: true });
      }
    }
  }

  // The state letters are often the weakest part of a reading (e.g. "TN" read
  // as "IN"). If nothing matched, offer valid state codes one letter away.
  if (found.size === 0) {
    for (const chunk of chunks) {
      const s = cleanPlate(chunk);
      for (let len = 8; len <= 11; len++) {
        for (let i = 0; i + len <= s.length; i++) {
          const m = parseIndianPlate(s.slice(i, i + len));
          if (!m || m.validState) continue;
          for (const alt of repairState(m.plate.slice(0, 2))) {
            const plate = alt.code + m.plate.slice(2);
            const fixes = m.fixes + alt.cost;
            const prev = found.get(plate);
            if (!prev || fixes < prev.fixes) found.set(plate, { plate, fixes, validState: true });
          }
        }
      }
    }
  }

  const list = [...found.values()].sort((a, b) => a.fixes - b.fixes || b.plate.length - a.plate.length);
  if (list.length) return list.slice(0, 5);

  // Fallback for plates that don't follow the Indian pattern: letter+digit tokens.
  const tokens = new Set<string>();
  for (const line of text.toUpperCase().split(/[\n\s]+/)) {
    const t = cleanPlate(line);
    if (t.length >= 5 && t.length <= 10 && /[A-Z]/.test(t) && /[0-9]/.test(t)) tokens.add(t);
  }
  return [...tokens].slice(0, 5).map((plate) => ({ plate, fixes: 0, validState: false }));
}

/** Show a stored plate the way it is printed: TN09AB1234 -> TN 09 AB 1234. */
export function formatPlate(plate: string): string {
  const std = plate.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})$/);
  if (std) return std.slice(1).join(" ");
  const bh = plate.match(/^(\d{2})(BH)(\d{4})([A-Z]{1,2})$/);
  if (bh) return bh.slice(1).join(" ");
  return plate;
}
