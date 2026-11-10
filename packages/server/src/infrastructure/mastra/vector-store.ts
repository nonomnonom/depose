import { PostgresStore, PgVector } from "@mastra/pg";
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { appConfig } from "../../config/app.config.js";

export const DOCUMENT_CHUNKS_INDEX = "document_chunks";

export const isVectorSearchEnabled = appConfig.rag.enabled;

export const vectorStore = new PgVector({
  id: "depose-vector-store",
  connectionString: appConfig.databaseUrl,
  max: 10,
});

let embedder: ModelRouterEmbeddingModel | null = null;
let indexReady: Promise<void> | null = null;

function getEmbedder(): ModelRouterEmbeddingModel {
  embedder ??= new ModelRouterEmbeddingModel(appConfig.rag.embeddingModel);
  return embedder;
}

export async function embedTexts(values: string[]): Promise<number[][]> {
  const result = await getEmbedder().doEmbed({ values });
  return result.embeddings;
}

export async function ensureVectorIndex(): Promise<void> {
  indexReady ??= vectorStore.createIndex({
    indexName: DOCUMENT_CHUNKS_INDEX,
    dimension: appConfig.rag.embeddingDimension,
    metric: "cosine",
  });
  try {
    await indexReady;
  } catch (error) {
    indexReady = null;
    throw error;
  }
}

export function createMastraStorage(): PostgresStore {
  return new PostgresStore({
    id: "depose-mastra-storage",
    connectionString: appConfig.databaseUrl,
  });
}
