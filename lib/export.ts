// Excel and PDF downloads for the Accounts tables. Both are built in the browser,
// so they work offline. No spreadsheet library: an .xlsx file is a zip of a few
// XML files, and we write it uncompressed.

export type ExportKind = "text" | "money" | "int" | "pct" | "plate";

export interface ExportColumn {
  label: string;
  kind?: ExportKind;
  align?: "left" | "right";
}

export type ExportCell = string | number | null;

export interface ExportTable {
  /** First lines above the table, e.g. the report title. */
  title?: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: ExportCell[][];
  totals?: ExportCell[] | null;
  note?: string | null;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** report_centre_date style file names: lower case, dashes, no odd characters. */
export function fileName(parts: string[], ext: string): string {
  return parts.map((p) => p.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")).filter(Boolean).join("_") + "." + ext;
}

// ------------------------------------------------------------------ xlsx

const enc = new TextEncoder();

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A zip with no compression ("stored"), enough for an .xlsx. */
export function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (v: DataView, o: number, n: number) => v.setUint16(o, n, true);
  const u32 = (v: DataView, o: number, n: number) => v.setUint32(o, n, true);
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    u32(lv, 0, 0x04034b50);
    u16(lv, 4, 20);
    u16(lv, 6, 0x0800); // file names are UTF-8
    u16(lv, 8, 0); // stored
    u16(lv, 10, 0);
    u16(lv, 12, 0x21); // 1980-01-01
    u32(lv, 14, crc);
    u32(lv, 18, f.data.length);
    u32(lv, 22, f.data.length);
    u16(lv, 26, name.length);
    local.set(name, 30);
    chunks.push(local, f.data);

    const cen = new Uint8Array(46 + name.length);
    const cv = new DataView(cen.buffer);
    u32(cv, 0, 0x02014b50);
    u16(cv, 4, 20);
    u16(cv, 6, 20);
    u16(cv, 8, 0x0800);
    u16(cv, 10, 0);
    u16(cv, 12, 0);
    u16(cv, 14, 0x21);
    u32(cv, 16, crc);
    u32(cv, 20, f.data.length);
    u32(cv, 24, f.data.length);
    u16(cv, 28, name.length);
    u32(cv, 42, offset);
    cen.set(name, 46);
    central.push(cen);
    offset += local.length + f.data.length;
  }
  const cenSize = central.reduce((a, c) => a + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  u32(ev, 0, 0x06054b50);
  u16(ev, 8, files.length);
  u16(ev, 10, files.length);
  u32(ev, 12, cenSize);
  u32(ev, 16, offset);
  const all = [...chunks, ...central, end];
  const out = new Uint8Array(all.reduce((a, c) => a + c.length, 0));
  let p = 0;
  for (const c of all) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

function colName(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

// style ids used in the sheet
const S = { text: 0, head: 1, money: 2, wrap: 3, int: 4, bold: 5, boldMoney: 6, pct: 7, title: 8, muted: 9, boldInt: 10 };

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="[&gt;=10000000]&quot;₹&quot;##\\,##\\,##\\,##0;[&gt;=100000]&quot;₹&quot;##\\,##\\,##0;&quot;₹&quot;##,##0"/><numFmt numFmtId="165" formatCode="0&quot;%&quot;"/></numFmts>
<fonts count="5">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="14"/><color rgb="FF10303F"/><name val="Calibri"/></font>
<font><sz val="10"/><color rgb="FF64748B"/><name val="Calibri"/></font>
</fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF10303F"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="11">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="3" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyAlignment="1"><alignment vertical="top"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

export function buildXlsx(table: ExportTable, sheetName = "Sheet1"): Uint8Array {
  const rows: string[] = [];
  let r = 1;
  const str = (ref: string, v: string, s: number) => `<c r="${ref}" t="inlineStr" s="${s}"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  const num = (ref: string, v: number, s: number) => `<c r="${ref}" s="${s}"><v>${v}</v></c>`;

  if (table.title) rows.push(`<row r="${r++}">${str("A1", table.title, S.title)}</row>`);
  if (table.subtitle) rows.push(`<row r="${r}">${str(`A${r}`, table.subtitle, S.muted)}</row>`), r++;
  if (table.note) rows.push(`<row r="${r}">${str(`A${r}`, table.note, S.muted)}</row>`), r++;
  if (r > 1) r++; // blank line before the table
  const headRow = r;
  rows.push(`<row r="${r}" ht="22" customHeight="1">${table.columns.map((c, i) => str(`${colName(i)}${r}`, c.label, S.head)).join("")}</row>`);
  r++;

  const cell = (c: ExportColumn, v: ExportCell, i: number, rowNo: number, bold: boolean): string => {
    const ref = `${colName(i)}${rowNo}`;
    if (v === null || v === undefined || v === "") return "";
    if (typeof v === "number") {
      const k = c.kind;
      const s = k === "money" ? (bold ? S.boldMoney : S.money) : k === "pct" ? S.pct : bold ? S.boldInt : S.int;
      return num(ref, v, s);
    }
    return str(ref, v, c.kind === "plate" || v.includes("\n") ? S.wrap : bold ? S.bold : S.text);
  };

  for (const row of table.rows) {
    const lines = Math.max(1, ...row.map((v) => (typeof v === "string" ? v.split("\n").length : 1)));
    rows.push(`<row r="${r}"${lines > 1 ? ` ht="${15 * lines}" customHeight="1"` : ""}>${row.map((v, i) => cell(table.columns[i], v, i, r, false)).join("")}</row>`);
    r++;
  }
  if (table.totals) {
    rows.push(`<row r="${r}">${table.totals.map((v, i) => cell(table.columns[i], v, i, r, true)).join("")}</row>`);
    r++;
  }

  const widths = table.columns.map((c, i) => {
    const longest = Math.max(c.label.length, ...table.rows.map((row) => (typeof row[i] === "string" ? Math.max(...(row[i] as string).split("\n").map((l) => l.length)) : String(row[i] ?? "").length + 4)));
    return Math.min(46, Math.max(10, longest + 3));
  });
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="${headRow}" topLeftCell="A${headRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join("")}</cols><sheetData>${rows.join("")}</sheetData></worksheet>`;

  const files = [
    { name: "[Content_Types].xml", text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: "_rels/.rels", text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", text: STYLES },
    { name: "xl/worksheets/sheet1.xml", text: sheet },
  ];
  return zipStore(files.map((f) => ({ name: f.name, data: enc.encode(f.text) })));
}

export function exportXlsx(name: string, table: ExportTable, sheetName?: string) {
  const bytes = buildXlsx(table, sheetName);
  downloadBlob(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), name);
}

// ------------------------------------------------------------------ pdf

async function fontBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("font");
  const bytes = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function money(n: number): string {
  let s = Math.round(Math.abs(n)).toString();
  if (s.length > 3) s = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + s.slice(-3);
  return `${n < 0 ? "-" : ""}₹${s}`;
}

export function cellText(c: ExportColumn, v: ExportCell): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return c.kind === "money" ? money(v) : c.kind === "pct" ? `${v}%` : v.toLocaleString("en-IN");
  return v;
}

export async function exportPdf(name: string, table: ExportTable) {
  const { jsPDF } = await import("jspdf");
  const wide = table.columns.length > 5;
  const doc = new jsPDF({ orientation: wide ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const [reg, bold] = await Promise.all([fontBase64("/fonts/Inter-Regular-subset.ttf"), fontBase64("/fonts/Inter-Bold-subset.ttf")]);
  doc.addFileToVFS("Inter-Regular.ttf", reg);
  doc.addFont("Inter-Regular.ttf", "Inter", "normal");
  doc.addFileToVFS("Inter-Bold.ttf", bold);
  doc.addFont("Inter-Bold.ttf", "Inter", "bold");

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;
  const NAVY: [number, number, number] = [16, 48, 63];
  const GREY: [number, number, number] = [100, 116, 139];
  const INK: [number, number, number] = [15, 23, 42];

  // column widths: share the space by how much text each column holds
  const weights = table.columns.map((c, i) => {
    const longest = Math.max(c.label.length, ...table.rows.slice(0, 80).map((r) => Math.max(...cellText(c, r[i]).split("\n").map((l) => l.length), 1)));
    return Math.min(28, Math.max(7, longest + 2));
  });
  const wsum = weights.reduce((a, b) => a + b, 0);
  const colW = weights.map((w) => ((W - 2 * M) * w) / wsum);

  const header = (first: boolean) => {
    doc.setFont("Inter", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...NAVY);
    doc.text("Dev Ventures", M, M + 6);
    doc.setFont("Inter", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GREY);
    doc.text("XO SmartGate · Format: Dev Ventures standard", W - M, M + 6, { align: "right" });
    doc.setDrawColor(58, 136, 166);
    doc.setLineWidth(1.4);
    doc.line(M, M + 14, W - M, M + 14);
    let y = M + 38;
    if (first) {
      doc.setFont("Inter", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...INK);
      doc.text(table.title ?? "", M, y);
      y += 15;
      doc.setFont("Inter", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...GREY);
      if (table.subtitle) {
        doc.text(table.subtitle, M, y);
        y += 13;
      }
      if (table.note) {
        doc.text(table.note, M, y);
        y += 13;
      }
      y += 6;
    }
    return y;
  };

  const drawHead = (y: number) => {
    doc.setFillColor(...NAVY);
    doc.rect(M, y, W - 2 * M, 22, "F");
    doc.setFont("Inter", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    let x = M;
    table.columns.forEach((c, i) => {
      if (c.align === "right") doc.text(c.label, x + colW[i] - 6, y + 14, { align: "right" });
      else doc.text(c.label, x + 6, y + 14);
      x += colW[i];
    });
    return y + 22;
  };

  let y = drawHead(header(true));
  const rowsAll = [...table.rows.map((r) => ({ r, total: false })), ...(table.totals ? [{ r: table.totals, total: true }] : [])];

  for (const { r, total } of rowsAll) {
    doc.setFont("Inter", total ? "bold" : "normal");
    doc.setFontSize(8.5);
    const cells = r.map((v, i) => doc.splitTextToSize(cellText(table.columns[i], v), colW[i] - 12) as string[]);
    const lines = Math.max(1, ...cells.map((c) => c.length));
    const h = lines * 11 + 9;
    if (y + h > H - M - 20) {
      doc.addPage();
      y = drawHead(header(false));
    }
    if (total) {
      doc.setFillColor(238, 243, 250);
      doc.rect(M, y, W - 2 * M, h, "F");
    }
    let x = M;
    r.forEach((v, i) => {
      const c = table.columns[i];
      cells[i].forEach((line, li) => {
        const isMake = c.kind === "plate" && li > 0;
        doc.setFont("Inter", total || (c.kind === "plate" && li === 0) ? "bold" : "normal");
        doc.setFontSize(isMake ? 7.5 : 8.5);
        doc.setTextColor(...(isMake ? GREY : INK));
        const ty = y + 13 + li * 11;
        if (c.align === "right") doc.text(line, x + colW[i] - 6, ty, { align: "right" });
        else doc.text(line, x + 6, ty);
      });
      x += colW[i];
    });
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(M, y + h, W - M, y + h);
    y += h;
  }

  const pages = doc.getNumberOfPages();
  const stamp = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("Inter", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(`Generated ${stamp}`, M, H - 20);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 20, { align: "right" });
  }
  downloadBlob(doc.output("blob"), name);
}
