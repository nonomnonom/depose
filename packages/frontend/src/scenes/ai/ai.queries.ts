import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  aiControllerCreate,
  aiControllerGet,
  aiControllerList,
  aiControllerRemove,
  aiControllerSend,
} from '~/generated/endpoints';
import type { AiControllerSendBody } from '~/generated/schemas';
import { unwrapData } from '~/lib/api/client';

const threadsKey = (matterId: string) => ['matter', matterId, 'ai', 'threads'] as const;
const threadKey = (matterId: string, threadId: string) =>
  ['matter', matterId, 'ai', 'thread', threadId] as const;

export function useAiThreads(matterId: string) {
  return useQuery({
    queryKey: threadsKey(matterId),
    queryFn: async () => unwrapData(await aiControllerList(matterId)).items,
    enabled: Boolean(matterId),
  });
}

export function useAiThread(matterId: string, threadId: string | null) {
  return useQuery({
    queryKey: threadKey(matterId, threadId ?? 'none'),
    queryFn: async () => unwrapData(await aiControllerGet(matterId, threadId!)),
    enabled: Boolean(matterId && threadId),
  });
}

export function useCreateAiThread(matterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrapData(await aiControllerCreate(matterId, {})),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: threadsKey(matterId) });
    },
  });
}

export function useSendAiMessage(matterId: string, threadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: AiControllerSendBody) =>
      unwrapData(await aiControllerSend(matterId, threadId, body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: threadKey(matterId, threadId) });
      void queryClient.invalidateQueries({ queryKey: threadsKey(matterId) });
    },
  });
}

export function useDeleteAiThread(matterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) =>
      unwrapData(await aiControllerRemove(matterId, threadId)),
    onSuccess: (_data, threadId) => {
      void queryClient.removeQueries({ queryKey: threadKey(matterId, threadId) });
      void queryClient.invalidateQueries({ queryKey: threadsKey(matterId) });
    },
  });
}
