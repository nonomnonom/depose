export interface TextChunk {
  content: string;
  pageNumber: number;
  sentenceStart: number;
  sentenceEnd: number;
}

function upperBound(values: number[], target: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (values[mid]! <= target) low = mid + 1;
    else high = mid;
  }
  return low;
}

/**
 * Splits text into overlapping chunks while keeping positional citations.
 * A form feed (\f) marks a page break; every chunk stays inside one page and
 * records the sentence range it covers, so it can be cited as
 * "page N, sentences X-Y".
 */
export function chunkText(
  text: string,
  maxLength = 1200,
  overlap = 200,
): TextChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const sentenceEnds: number[] = [];
  for (const match of normalized.matchAll(/[.!?]+(?=\s|$)/g)) {
    sentenceEnds.push((match.index ?? 0) + match[0].length);
  }
  const sentencesAt = (offset: number) => upperBound(sentenceEnds, offset);

  const effectiveOverlap = Math.min(
    Math.max(overlap, 0),
    Math.floor(maxLength / 2),
  );
  const pages = normalized.split("\f");
  const chunks: TextChunk[] = [];
  let pageOffset = 0;

  pages.forEach((pageText, pageIndex) => {
    const page = pageText.trim();
    if (!page) {
      pageOffset += pageText.length + 1;
      return;
    }

    let start = 0;
    while (start < page.length) {
      let end = Math.min(start + maxLength, page.length);
      if (end < page.length) {
        const paragraphBreak = page.lastIndexOf("\n\n", end);
        const sentenceBreak = page.lastIndexOf(". ", end);
        const breakAt = Math.max(paragraphBreak, sentenceBreak);
        if (breakAt > start + maxLength / 2) end = breakAt + 1;
      }

      const content = page.slice(start, end).trim();
      if (content) {
        const globalStart = pageOffset + start;
        const globalEnd = pageOffset + end;
        const sentenceStart = sentencesAt(globalStart) + 1;
        chunks.push({
          content,
          pageNumber: pageIndex + 1,
          sentenceStart,
          sentenceEnd: Math.max(sentenceStart, sentencesAt(globalEnd)),
        });
      }

      if (end >= page.length) break;
      start = Math.max(end - effectiveOverlap, start + 1);
    }

    pageOffset += pageText.length + 1;
  });

  return chunks;
}
