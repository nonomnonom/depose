import { z } from 'zod';

export const FACT_TYPES = [
  'event',
  'statement',
  'admission',
  'denial',
  'intent',
  'relationship',
  'amount',
  'location',
  'other',
] as const;

export const DATE_PRECISIONS = ['day', 'month', 'year', 'unknown'] as const;

/** One atomic fact proposed by the extraction model. */
export const ExtractedFact = z
  .object({
    text: z.string().trim().min(1).max(4_000).describe('One atomic fact, in plain language'),
    factType: z.enum(FACT_TYPES).default('other').describe('The kind of fact'),
    entity: z.string().trim().max(300).nullable().optional().describe('Who the fact is about'),
    action: z.string().trim().max(300).nullable().optional().describe('What happened'),
    object: z.string().trim().max(300).nullable().optional().describe('To whom or what'),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be ISO 8601 or null')
      .nullable()
      .optional()
      .describe('ISO 8601 date, or null when the text gives no absolute date'),
    dateText: z
      .string()
      .trim()
      .max(200)
      .nullable()
      .optional()
      .describe('The date wording as written in the source'),
    datePrecision: z.enum(DATE_PRECISIONS).default('unknown').describe('Precision of the date'),
    sourceQuote: z
      .string()
      .trim()
      .min(1)
      .max(8_000)
      .describe('Verbatim quote from the document that supports the fact'),
    confidence: z.coerce
      .number()
      .min(0)
      .max(1)
      .default(0.5)
      .describe('Model confidence that the fact is explicit in the text'),
  })
  .strict();

export const ExtractedFacts = z.object({
  facts: z
    .array(ExtractedFact)
    .max(200)
    .describe('Atomic facts explicitly stated in the document'),
});
