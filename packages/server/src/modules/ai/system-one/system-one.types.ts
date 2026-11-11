/**
 * The public decision contract Depose uses. `noul` keeps the System One
 * primitive name used by the OpenRouter Decisions route; the AI SDK TypeSafe
 * provider exposes the same primitive as `boolean`, and SystemOneService maps
 * between them. Callers never depend on a provider's wire format.
 */
export type DecisionQuestion =
  | {
      type: 'noul';
      instructions: string;
      threshold?: number;
      criteria?: { true?: string; false?: string };
    }
  | {
      type: 'choice';
      instructions: string;
      options: string[];
      threshold?: number;
      criteria?: Record<string, string | null>;
    }
  | {
      type: 'score';
      instructions: string;
      min?: number;
      max?: number;
      threshold?: number;
      criteria?: string[];
    }
  | { type: 'box'; instructions: string; threshold?: number };

export type DecisionAnswer =
  | {
      type: 'noul';
      noul: number;
      confidence: number;
      threshold: number;
    }
  | {
      type: 'choice';
      choice: string;
      confidence: number;
      threshold: number;
    }
  | {
      type: 'score';
      score: number;
      confidence: number;
      threshold: number;
    }
  | {
      type: 'box';
      box: number[];
      confidence: number;
      threshold: number;
    };

export interface DecisionResult {
  answers: Record<string, DecisionAnswer>;
  model: string;
  provider: string;
  degraded: boolean;
  usage: { inputTokens: number; outputTokens: number; costUsd: number | null };
}
