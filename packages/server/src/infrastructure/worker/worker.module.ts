import { Module } from "@nestjs/common";
import { TextExtractorService } from "../ingest/text-extractor.service.js";
import { IngestService } from "./ingest/service.js";
import { IngestWorker } from "./ingest-worker.js";

@Module({
  providers: [TextExtractorService, IngestService, IngestWorker],
})
export class WorkerModule {}
