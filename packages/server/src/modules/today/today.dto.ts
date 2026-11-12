import { z } from 'zod';

export const recordRecentSchema = z.object({
  resourceType: z.enum(['matter']).default('matter'),
  resourceId: z.string().uuid(),
});
export type RecordRecentInput = z.infer<typeof recordRecentSchema>;

export const todayQuerySchema = z.object({
  matterId: z.string().uuid().optional(),
});
export type TodayQuery = z.infer<typeof todayQuerySchema>;

/** One "Jump back in" row: a recently touched object inside the scope. */
export const jumpBackItemSchema = z.object({
  type: z.enum(['document', 'report', 'subset', 'matter']),
  id: z.string().uuid(),
  title: z.string(),
  updatedAt: z.string(),
});
export type JumpBackItem = z.infer<typeof jumpBackItemSchema>;

export const forYouItemSchema = z.object({
  type: z.enum(['document', 'report', 'subset', 'matter']),
  id: z.string().uuid(),
  title: z.string(),
  reason: z.string(),
  updatedAt: z.string(),
});
export type ForYouItem = z.infer<typeof forYouItemSchema>;

export const chatItemSchema = z.object({
  threadId: z.string().uuid(),
  matterId: z.string().uuid(),
  title: z.string().nullable(),
  updatedAt: z.string(),
});
export type ChatItem = z.infer<typeof chatItemSchema>;

export const todayOverviewSchema = z.object({
  scope: z.enum(['matter', 'firm']),
  jumpBackIn: z.array(jumpBackItemSchema),
  forYou: z.array(forYouItemSchema),
  chats: z.array(chatItemSchema),
});
export type TodayOverview = z.infer<typeof todayOverviewSchema>;
