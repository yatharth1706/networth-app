/**
 * Parser for the CAMS / KFintech Consolidated Account SUMMARY statement
 * ("As on <date>" with one row per scheme). A TypeScript port of the
 * column-clustering approach used by the open-source `casparser` Python
 * library (MIT), adapted to pdf.js word-level extraction.
 *
 * Row anatomy:
 *   <folio> <ISIN> <rta_code>-<scheme name> <cost> <unit balance>
 *   <NAV date> <NAV> <market value> <registrar>
 * Long scheme names wrap onto continuation lines that have ONLY the
 * scheme column populated.
 */

import { lineText, type TextLine, type Word } from "./text";

export interface CasScheme {
  folio: string;
  isin: string | null;
  rtaCode: string;
  name: string;
  /** Unit balance. */
  units: number;
  nav: number;
  /** ISO date the NAV was struck. */
  navDate: string | null;
  marketValue: number;
  costValue: number | null;
  registrar: string;
}

export interface CasSummary {
  /** ISO statement date ("As on"). */
  asOn: string | null;
  schemes: CasScheme[];
  /** The statement's own printed grand total, when found. */
  totalMarketValue: number | null;
  warnings: string[];
}

interface Column {
  label: string;
  xLo: number;
  xHi: number;
  align: "left" | "right";
}

const HEADER_LABELS = new Set([
  "Folio", "No", "No.", "ISIN", "Scheme", "Name", "Cost", "Value", "Unit",
  "Balance", "Closing", "NAV", "Date", "Price", "Market", "Registrar",
]);
const MIN_HEADER_HITS = 5;
const HEADER_WINDOW_Y = 15.0;
const X_CLUSTER_GAP = 7.0;
const NUMERIC_WIDTH = 42.0;

/** (required tokens, canonical label, alignment) — first match wins. */
const COLUMN_RULES: Array<[string[], string, "left" | "right"]> = [
  [["Folio"], "Folio", "left"],
  [["ISIN"], "ISIN", "left"],
  [["Scheme"], "Scheme", "left"],
  [["Cost"], "Cost", "right"],
  [["Closing", "Balance"], "Balance", "right"],
  [["Unit", "Balance"], "Balance", "right"],
  [["NAV", "Date"], "NAVDate", "left"],
  [["NAV"], "NAV", "right"],
  [["Price"], "NAV", "right"],
  [["Market"], "MarketValue", "right"],
  [["Registrar"], "Registrar", "left"],
];

const FOLIO_CELL_RE = /^\s*(\d{6,}(?:\s*\/\s*\d+)?)/;
const ISIN_RE = /(INF[A-Z0-9]{8}\d)/;
const AS_ON_RE = /as\s+on\s+(\d{2}-[A-Za-z]{3}-\d{4})/i;
const SCHEME_CELL_RE = /^\s*([\w\s]{2,15}?)\s*-\s*(.+)$/;
const SCHEME_LOOKS_LIKE_DATA = /^\s*[A-Z0-9][\w\s]{1,15}\s*-\s*\S/;
const TOTAL_RE = /^\s*(?:grand\s+|sub\s+|portfolio\s+)?total\b/i;
const DATE_RE = /(\d{1,2})[-\s]*([A-Za-z]{3})[-\s]*(\d{4})/;

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function toIsoDate(text: string): string | null {
  const m = DATE_RE.exec(text);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${month}-${m[1].padStart(2, "0")}`;
}

function parseNumber(text: string): number | null {
  const s = text.trim();
  if (!s) return null;
  const negative = s.startsWith("(") || s.startsWith("-");
  const cleaned = s.replace(/^[(\-]+/, "").replace(/\)+$/, "").replace(/,/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

function detectColumns(lines: TextLine[]): { headerEnd: number; columns: Column[] } | null {
  for (let i = 0; i < lines.length; i++) {
    const window: TextLine[] = [lines[i]];
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[i].y - lines[j].y > HEADER_WINDOW_Y) break;
      window.push(lines[j]);
    }
    const words = window.flatMap((l) => l.words);
    const labels = new Set(words.map((w) => w.text).filter((t) => HEADER_LABELS.has(t)));
    if (labels.size >= MIN_HEADER_HITS && labels.has("Folio") && labels.has("Scheme")) {
      return { headerEnd: i + window.length - 1, columns: buildColumns(words) };
    }
  }
  return null;
}

function buildColumns(words: Word[]): Column[] {
  const sorted = [...words].sort((a, b) => a.x0 - b.x0);
  const clusters: Word[][] = [];
  let cluster: Word[] = [];
  let clusterMaxX1 = 0;
  for (const w of sorted) {
    if (cluster.length > 0 && w.x0 - clusterMaxX1 > X_CLUSTER_GAP) {
      clusters.push(cluster);
      cluster = [];
      clusterMaxX1 = 0;
    }
    cluster.push(w);
    clusterMaxX1 = Math.max(clusterMaxX1, w.x1);
  }
  if (cluster.length > 0) clusters.push(cluster);

  const columns: Column[] = [];
  const seen = new Set<string>();
  for (const c of clusters) {
    const tokens = new Set(c.map((w) => w.text));
    for (const [required, label, align] of COLUMN_RULES) {
      if (required.every((t) => tokens.has(t)) && !seen.has(label)) {
        columns.push({
          label,
          xLo: Math.min(...c.map((w) => w.x0)),
          xHi: Math.max(...c.map((w) => w.x1)),
          align,
        });
        seen.add(label);
        break;
      }
    }
  }
  return columns.sort((a, b) => a.xLo - b.xLo);
}

function columnRanges(columns: Column[]): Array<{ col: Column; lo: number; hi: number }> {
  const sorted = [...columns].sort(
    (a, b) => (a.xLo + a.xHi) / 2 - (b.xLo + b.xHi) / 2,
  );
  return sorted.map((col, i) => {
    if (col.align === "right") {
      return { col, lo: col.xHi - NUMERIC_WIDTH, hi: col.xHi + 3 };
    }
    const next = sorted[i + 1];
    const hi = next
      ? next.align === "right"
        ? next.xHi - NUMERIC_WIDTH
        : next.xLo - 3
      : Infinity;
    return { col, lo: col.xLo - 3, hi };
  });
}

function assignCells(line: TextLine, columns: Column[]): Record<string, string> {
  const ranges = columnRanges(columns);
  const cells: Record<string, string[]> = {};
  for (const word of line.words) {
    const xMid = (word.x0 + word.x1) / 2;
    const hit = ranges.find((r) => xMid >= r.lo && xMid < r.hi);
    if (!hit) continue;
    (cells[hit.col.label] ??= []).push(word.text);
  }
  return Object.fromEntries(
    Object.entries(cells).map(([label, words]) => [label, words.join(" ").trim()]),
  );
}

/** Parses the SUMMARY holdings table from extracted pages of word-lines. */
export function parseSummary(pages: TextLine[][]): CasSummary {
  let asOn: string | null = null;
  let totalMarketValue: number | null = null;
  const schemes: CasScheme[] = [];
  const warnings: string[] = [];
  let lastColumns: Column[] = [];
  let current: CasScheme | null = null;

  for (const lines of pages) {
    const detected = detectColumns(lines);
    const headerEnd = detected ? detected.headerEnd : -1;
    const columns = detected ? detected.columns : lastColumns;
    if (detected) lastColumns = detected.columns;

    for (let i = 0; i < lines.length; i++) {
      const text = lineText(lines[i]);

      if (!asOn) {
        const m = AS_ON_RE.exec(text);
        if (m) asOn = toIsoDate(m[1]);
      }

      if (columns.length === 0 || i <= headerEnd) continue;

      const cells = assignCells(lines[i], columns);
      const folioRaw = cells["Folio"] ?? "";
      const isinMatch = ISIN_RE.exec(cells["ISIN"] ?? "") ?? ISIN_RE.exec(folioRaw);
      const folioMatch = FOLIO_CELL_RE.exec(folioRaw);
      const folio = folioMatch ? folioMatch[1].replace(/\s/g, "") : "";
      const schemeCell = cells["Scheme"] ?? "";
      const balanceCell = cells["Balance"] ?? "";
      const navDateCell = cells["NAVDate"] ?? "";
      const navCell = cells["NAV"] ?? "";
      const valueCell = cells["MarketValue"] ?? "";
      const costCell = cells["Cost"] ?? "";
      const rtaCell = cells["Registrar"] ?? "";

      // Grand-total row ends the table; capture the printed total as a
      // checksum and stop appending continuations to the last scheme.
      if (!folio && (TOTAL_RE.test(schemeCell) || TOTAL_RE.test(text))) {
        totalMarketValue = parseNumber(valueCell) ?? totalMarketValue;
        current = null;
        continue;
      }

      const isMain = Boolean(folio) && SCHEME_LOOKS_LIKE_DATA.test(schemeCell);
      const isContinuation =
        current !== null &&
        !folio &&
        Boolean(schemeCell) &&
        !balanceCell && !navDateCell && !navCell && !valueCell && !costCell;

      if (isMain) {
        let rtaCode = "";
        let name = schemeCell;
        const m = SCHEME_CELL_RE.exec(schemeCell);
        if (m) {
          rtaCode = m[1].trim();
          name = m[2].trim();
        }
        const units = parseNumber(balanceCell);
        const nav = parseNumber(navCell);
        const value = parseNumber(valueCell);
        if (units === null && value === null) {
          warnings.push(`Skipped row with no units/value: "${text.slice(0, 80)}"`);
          continue;
        }
        current = {
          folio,
          isin: isinMatch ? isinMatch[1] : null,
          rtaCode,
          name,
          units: units ?? 0,
          nav: nav ?? 0,
          navDate: navDateCell ? toIsoDate(navDateCell) : asOn,
          marketValue: value ?? 0,
          costValue: parseNumber(costCell),
          registrar: rtaCell || "CAMS",
        };
        schemes.push(current);
      } else if (isContinuation && current) {
        current.name = `${current.name} ${schemeCell}`.trim();
      }
    }
  }

  if (totalMarketValue !== null && schemes.length > 0) {
    const computed = schemes.reduce((sum, s) => sum + s.marketValue, 0);
    if (Math.abs(computed - totalMarketValue) > 1) {
      warnings.push(
        `Parsed market values sum to ${computed.toFixed(2)} but the statement prints ` +
          `${totalMarketValue.toFixed(2)} — a row may be missing or mis-parsed.`,
      );
    }
  }
  if (schemes.length === 0) {
    warnings.push(
      "No holdings found. Is this a CAMS/KFintech Consolidated Account *Summary*? " +
        "(Detailed/transaction statements aren't supported yet.)",
    );
  }

  return { asOn, schemes, totalMarketValue, warnings };
}
