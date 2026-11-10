import { z } from "zod";

export const askQuestionSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  threadId: z.string().trim().min(1).max(200).optional(),
});

export type AskQuestionInput = z.infer<typeof askQuestionSchema>;
