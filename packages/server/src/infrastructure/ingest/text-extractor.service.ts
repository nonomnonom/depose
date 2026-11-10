import { Injectable, UnsupportedMediaTypeException } from "@nestjs/common";

const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "application/json",
]);

/**
 * Seam for ingest & OCR. Text formats are stored as-is; PDF/Word/image
 * extraction needs an OCR adapter and is rejected until one is configured.
 */
@Injectable()
export class TextExtractorService {
  extract(mimeType: string, content: string): string {
    const normalizedType = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
    if (normalizedType.startsWith("text/") || TEXT_MIME_TYPES.has(normalizedType)) {
      const text = content.trim();
      if (!text) throw new UnsupportedMediaTypeException("Document content is empty");
      return text;
    }
    throw new UnsupportedMediaTypeException(
      `No OCR/extraction adapter is configured for "${mimeType}". Send extracted text (text/plain) or add an OCR provider.`,
    );
  }
}
