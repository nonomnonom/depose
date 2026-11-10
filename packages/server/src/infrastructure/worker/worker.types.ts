export interface IngestDocumentPayload {
  documentId: string;
}

export interface IngestDocumentResult {
  documentId: string;
  chunkCount: number;
  status: "done" | "failed";
}
