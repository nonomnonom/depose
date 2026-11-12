# Document ingestion

Upload is asynchronous. The HTTP request stores the file and enqueues work;
nothing is parsed inline.

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant API as DocumentsController
  participant FS as Local storage
  participant DB as Postgres
  participant Q as BullMQ
  participant W as IngestProcessor
  participant OCR as OcrProcessor
  participant X as ExtractionProcessor
  participant E as EmbeddingProcessor

  U->>API: POST /matters/:id/documents (raw file)
  API->>API: size, MIME, file name checks
  API->>DB: duplicate sha256 for this matter?
  alt duplicate
    DB-->>API: existing document
    API-->>U: existing document, duplicate=true
  else new file
    API->>FS: put firm/matter/uuid.ext
    API->>DB: insert document (queued)
    API->>Q: enqueue document.ingest
    API-->>U: document + jobId
    Q->>W: ingest job
    W->>W: extract text/pages
    alt text layer is usable
      W->>DB: write pages
      W->>W: rebuild chunks
      W->>Q: document.embedding
      W->>Q: webhook document.processed
    else scanned pages
      W->>Q: document.ocr
      OCR->>OCR: OCR low-text pages only
      OCR->>DB: update page text and confidence
      OCR->>Q: webhook document.processed
    end
    E->>DB: read pending chunks
    E->>E: call embedding route
    E->>E: upsert vectors into Qdrant
    E->>DB: mark chunks embedded
  end
```

## Status model

```mermaid
stateDiagram-v2
  [*] --> queued
  queued --> processing
  processing --> done
  processing --> needs_review: no text layer / low confidence
  needs_review --> processing: OCR enqueued
  processing --> failed: unrecoverable parse
  failed --> processing: reprocess endpoint
  done --> [*]
```

`needs_review` is not an error. It means the document is stored but the text
layer is missing or too short; the OCR job is the next step. If no OCR provider
is configured, the document stays readable as an image/PDF and the reason is
returned.

## Extraction

Fact extraction is a separate queue (`fact.extraction`) and a separate route
(`EXTRACTION_PROVIDER`). It writes candidate facts plus `fact_sources`, never
confirmed facts. A reviewer promotes or rejects them. Re-running extraction
records a new `extraction_runs` row; facts keep their version history.

Chunking is deterministic: same document text produces the same chunk
boundaries, and `chunkVersion` is part of the chunk identity. Embedding jobs
only process chunks that are not yet embedded, so a retry does not duplicate
points.

## Limits and safety

- 100 MB per file, enumerated MIME types, sanitized file name.
- Content-addressed duplicate detection per matter.
- Local storage only; `STORAGE_TYPE` rejects anything else.
- OCR reads only pages whose `charCount` is below `OCR_MIN_TEXT_CHARS`.
- Every job is tracked in `jobs` with progress and a terminal state.
