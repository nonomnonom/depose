import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { MASTRA_MODEL } from "../model.js";

export const extractedFactsSchema = z.array(
  z.object({
    text: z.string().describe("One factual statement, in the document's language"),
    entity: z
      .string()
      .nullable()
      .describe("Person, organization, or place involved, or null"),
    action: z.string().nullable().describe("What happened, or null"),
    date: z
      .string()
      .nullable()
      .describe("ISO 8601 date or date-time, or null when no date is stated"),
    sourceQuote: z
      .string()
      .describe("Verbatim excerpt from the document that supports the fact"),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .describe("Extraction confidence between 0 and 1"),
  }),
);

export const factExtractorAgent = new Agent({
  id: "fact-extractor",
  name: "Fact Extractor",
  instructions: `
You extract facts from legal case documents.

Rules:
- Only extract facts explicitly stated in the supplied text. Never infer names, dates, amounts, or intent.
- Each fact is one atomic statement: entity (who), action (what), date (when).
- date must be an ISO 8601 date or date-time. If the document only gives a relative date, keep the wording in text and set date to null.
- sourceQuote must be copied verbatim from the document.
- confidence reflects how explicit the statement is: 1 for a direct sentence, lower when the fact requires combining clauses.
- Ignore boilerplate, signatures, headers, footers, and page numbers.
- Do not deduplicate facts across documents; the caller handles that.
`,
  model: MASTRA_MODEL,
});
