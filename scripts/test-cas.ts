/**
 * CAS summary parser test. Builds a fixture PDF in-memory that replicates the
 * KFintech/CAMS Consolidated Account Summary layout (column positions,
 * two-baseline header with (INR) sublabels, wrapped scheme names, total row),
 * then runs it through the same extraction + parsing code the browser uses.
 *
 * Run: npx tsx scripts/test-cas.ts
 */

import { PDFDocument, StandardFonts } from "pdf-lib";
import { linesFromTextContent, type PdfTextItem } from "../src/lib/cas/text";
import { parseSummary } from "../src/lib/cas/summary";

// Column geometry (pts). Left columns anchor at xLo; right columns at xHi.
const COL = {
  folio: 36,
  isin: 100,
  scheme: 152,
  costEnd: 330,
  balanceEnd: 392,
  navDate: 400,
  navEnd: 505,
  valueEnd: 565,
  registrar: 575,
};

interface FixtureRow {
  folio: string;
  isin: string;
  scheme: string[];
  cost: string;
  units: string;
  navDate: string;
  nav: string;
  value: string;
  rta: string;
}

const ROWS: FixtureRow[] = [
  { folio: "910011223344/4", isin: "INF846K01DS2", scheme: ["128GODGG - Axis Gold Fund - Direct Plan -", "Growth (Demat)"], cost: "5,500.000", units: "114.402", navDate: "10-Jun-2026", nav: "45.9918", value: "5,261.55", rta: "KFINTECH" },
  { folio: "9100456/10", isin: "INF194KB1AL4", scheme: ["GD340 - Bandhan Small Cap Fund-Direct", "Plan-Growth (Demat)"], cost: "2,000.000", units: "37.845", navDate: "10-Jun-2026", nav: "52.043", value: "1,969.57", rta: "CAMS" },
  { folio: "91011224455/0", isin: "INF754K01LB7", scheme: ["118UTD1G - Edelweiss US Technology", "Equity Fund of Fund - Direct Plan Growth"], cost: "1,000.000", units: "22.853", navDate: "10-Jun-2026", nav: "40.7137", value: "930.43", rta: "KFINTECH" },
  { folio: "42600118/90", isin: "INF179K01UT0", scheme: ["H02T - HDFC Flexi Cap Fund - Direct Plan"], cost: "5,204.000", units: "2.441", navDate: "10-Jun-2026", nav: "2,118.330", value: "5,170.84", rta: "CAMS" },
  { folio: "42900229/79", isin: "INF179KC1DU7", scheme: ["HSLFDG - HDFC Silver ETF Fund of Fund"], cost: "5,000.000", units: "131.425", navDate: "10-Jun-2026", nav: "38.0426", value: "4,999.75", rta: "CAMS" },
  { folio: "910055667788/4", isin: "INF247L01999", scheme: ["127LMGDG - Motilal Oswal Large and", "Midcap Fund - Direct Plan Growth"], cost: "6,504.000", units: "170.858", navDate: "10-Jun-2026", nav: "37.9321", value: "6,481.00", rta: "KFINTECH" },
  { folio: "488011223344/4", isin: "INF204K01K15", scheme: ["RMFSCAGG - NIPPON INDIA SMALL CAP", "FUND - DIRECT GROWTH PLAN"], cost: "5,000.000", units: "25.915", navDate: "10-Jun-2026", nav: "192.2399", value: "4,981.90", rta: "KFINTECH" },
  { folio: "588055667788/4", isin: "INF789F01XA0", scheme: ["108NID2G - UTI Nifty 50 Index Fund -", "Direct Plan (Demat)"], cost: "7,500.000", units: "45.810", navDate: "10-Jun-2026", nav: "162.6069", value: "7,449.02", rta: "KFINTECH" },
  { folio: "1001000222", isin: "INF03VN01597", scheme: ["YD101G - WhiteOak Capital - Mid Cap Fund"], cost: "3,000.000", units: "137.337", navDate: "10-Jun-2026", nav: "21.5040", value: "2,953.29", rta: "CAMS" },
];

async function buildFixturePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const size = 7;

  const left = (text: string, x: number, y: number) =>
    page.drawText(text, { x, y, size, font });
  const right = (text: string, xEnd: number, y: number) =>
    page.drawText(text, { x: xEnd - font.widthOfTextAtSize(text, size), y, size, font });

  page.drawText("Consolidated Account Summary", { x: 200, y: 750, size: 14, font });
  page.drawText("As on 11-Jun-2026", { x: 265, y: 735, size: 9, font });

  // Header: two baselines, (INR) sublabels under the numeric columns.
  const hy = 700;
  left("Folio No.", COL.folio, hy);
  left("ISIN", COL.isin, hy);
  left("Scheme Name", COL.scheme, hy);
  right("Cost Value", COL.costEnd, hy);
  right("Unit Balance", COL.balanceEnd, hy);
  left("NAV Date", COL.navDate, hy);
  right("NAV", COL.navEnd, hy);
  right("Market Value", COL.valueEnd, hy);
  left("Registrar", COL.registrar, hy);
  right("(INR)", COL.costEnd, hy - 8);
  right("(INR)", COL.navEnd, hy - 8);
  right("(INR)", COL.valueEnd, hy - 8);

  let y = 680;
  for (const row of ROWS) {
    left(row.folio, COL.folio, y);
    left(row.isin, COL.isin, y);
    left(row.scheme[0], COL.scheme, y);
    right(row.cost, COL.costEnd, y);
    right(row.units, COL.balanceEnd, y);
    left(row.navDate, COL.navDate, y);
    right(row.nav, COL.navEnd, y);
    right(row.value, COL.valueEnd, y);
    left(row.rta, COL.registrar, y);
    if (row.scheme[1]) {
      y -= 9;
      left(row.scheme[1], COL.scheme, y);
    }
    y -= 18;
  }
  left("Total", COL.scheme, y);
  right("40,708.00", COL.costEnd, y);
  right("40,197.35", COL.valueEnd, y);
  y -= 20;
  left("Disclaimer: Mutual fund investments are subject to market risks.", COL.folio, y);

  return doc.save();
}

async function extractPages(data: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data,
    standardFontDataUrl: "node_modules/pdfjs-dist/standard_fonts/",
  }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    pages.push(linesFromTextContent(content.items as unknown as PdfTextItem[]));
  }
  return pages;
}

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures++;
    console.error(`✗ ${label}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`);
  } else {
    console.log(`✓ ${label}`);
  }
}

async function main() {
  const pdfBytes = await buildFixturePdf();
  const pages = await extractPages(pdfBytes);
  const result = parseSummary(pages);

  check("statement date", result.asOn, "2026-06-11");
  check("scheme count", result.schemes.length, ROWS.length);
  check("printed total", result.totalMarketValue, 40197.35);
  check("warnings", result.warnings, []);

  const num = (s: string) => Number(s.replace(/,/g, ""));
  ROWS.forEach((row, i) => {
    const s = result.schemes[i];
    if (!s) return;
    const expectedName = row.scheme.join(" ").replace(/^[A-Z0-9]+ - /i, "");
    check(`row ${i + 1} folio`, s.folio, row.folio.replace(/\s/g, ""));
    check(`row ${i + 1} isin`, s.isin, row.isin);
    check(`row ${i + 1} name`, s.name, expectedName);
    check(`row ${i + 1} units`, s.units, num(row.units));
    check(`row ${i + 1} nav`, s.nav, num(row.nav));
    check(`row ${i + 1} value`, s.marketValue, num(row.value));
    check(`row ${i + 1} cost`, s.costValue, num(row.cost));
    check(`row ${i + 1} navDate`, s.navDate, "2026-06-10");
    check(`row ${i + 1} registrar`, s.registrar, row.rta);
  });

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll checks passed.");
}

void main();
