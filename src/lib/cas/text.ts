/**
 * Geometry model for parsed PDF text. The CAS table is column-positional, so
 * we keep x-coordinates for every word and reconstruct rows/cells from them.
 * Pure data — no pdf.js imports — so the parser is testable in Node.
 */

export interface Word {
  text: string;
  x0: number;
  x1: number;
}

export interface TextLine {
  y: number;
  words: Word[];
}

/** Minimal shape of a pdf.js TextItem we rely on. */
export interface PdfTextItem {
  str: string;
  /** [a, b, c, d, e, f] — e is x, f is y in PDF points. */
  transform: number[];
  width: number;
}

const LINE_Y_TOLERANCE = 2.5;

/**
 * Groups pdf.js text items into lines (by y proximity) of words (split on
 * whitespace, with x-positions apportioned by character count). CAS PDFs
 * position each table cell as its own item, so per-item width is reliable;
 * intra-item splits are an approximation but only affect multi-word labels
 * like "Folio No." where exact x hardly matters.
 */
export function linesFromTextContent(items: PdfTextItem[]): TextLine[] {
  const words: Array<Word & { y: number }> = [];
  for (const item of items) {
    const str = item.str;
    if (!str || !str.trim()) continue;
    const x = item.transform[4];
    const y = item.transform[5];
    const charW = item.width > 0 ? item.width / str.length : 5;
    let pos = 0;
    for (const part of str.split(/(\s+)/)) {
      if (part && part.trim()) {
        words.push({
          text: part,
          x0: x + pos * charW,
          x1: x + (pos + part.length) * charW,
          y,
        });
      }
      pos += part.length;
    }
  }

  words.sort((a, b) => b.y - a.y || a.x0 - b.x0);
  const lines: TextLine[] = [];
  for (const word of words) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line.y - word.y) <= LINE_Y_TOLERANCE) {
      line.words.push(word);
    } else {
      lines.push({ y: word.y, words: [word] });
    }
  }
  for (const line of lines) line.words.sort((a, b) => a.x0 - b.x0);
  return lines;
}

/** Plain text of a line, words joined by single spaces. */
export function lineText(line: TextLine): string {
  return line.words.map((w) => w.text).join(" ");
}
