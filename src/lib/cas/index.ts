/**
 * Browser entry point for CAS import. The PDF is opened and parsed entirely
 * client-side with pdf.js — the file and password never leave the device.
 */

import { linesFromTextContent, type PdfTextItem, type TextLine } from "./text";
import { parseSummary, type CasScheme, type CasSummary } from "./summary";

export type { CasScheme, CasSummary };

export class CasPasswordError extends Error {
  constructor(message = "Wrong or missing PDF password.") {
    super(message);
    this.name = "CasPasswordError";
  }
}

async function extractPages(data: ArrayBuffer, password?: string): Promise<TextLine[][]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const task = pdfjs.getDocument({ data, password });
  try {
    let doc;
    try {
      doc = await task.promise;
    } catch (err) {
      if (err instanceof Error && err.name === "PasswordException") {
        throw new CasPasswordError();
      }
      throw err;
    }
    const pages: TextLine[][] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      pages.push(linesFromTextContent(content.items as unknown as PdfTextItem[]));
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

export async function parseCasPdf(file: File, password: string): Promise<CasSummary> {
  const data = await file.arrayBuffer();
  const pages = await extractPages(data, password || undefined);
  return parseSummary(pages);
}
