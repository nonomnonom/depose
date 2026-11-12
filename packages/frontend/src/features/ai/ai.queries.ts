import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  conversationControllerCreate,
  conversationControllerGet,
  conversationControllerList,
  conversationControllerRemove,
  conversationControllerSend,
} from '~/generated/endpoints';
import type {
  ConversationControllerCreateBody,
  ConversationControllerSendBody,
} from '~/generated/schemas';
import { unwrapData } from '~/features/lib/api/client';

const threadsKey = (matterId: string) => ['matter', matterId, 'ai', 'threads'] as const;
const threadKey = (matterId: string, threadId: string) =>
  ['matter', matterId, 'ai', 'thread', threadId] as const;

export function useAiThreads(matterId: string) {
  return useQuery({
    queryKey: threadsKey(matterId),
    queryFn: async () => unwrapData(await conversationControllerList(matterId)).items,
    enabled: Boolean(matterId),
  });
}

export function useAiThread(matterId: string, threadId: string | null) {
  return useQuery({
    queryKey: threadKey(matterId, threadId ?? 'none'),
    queryFn: async () => unwrapData(await conversationControllerGet(matterId, threadId!)),
    enabled: Boolean(matterId && threadId),
  });
}

export function useCreateAiThread(matterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ConversationControllerCreateBody = {}) =>
      unwrapData(await conversationControllerCreate(matterId, body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: threadsKey(matterId) });
    },
  });
}

export function useSendAiMessage(matterId: string, threadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ConversationControllerSendBody) =>
      unwrapData(await conversationControllerSend(matterId, threadId, body)),
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
      unwrapData(await conversationControllerRemove(matterId, threadId)),
    onSuccess: (_data, threadId) => {
      void queryClient.removeQueries({ queryKey: threadKey(matterId, threadId) });
      void queryClient.invalidateQueries({ queryKey: threadsKey(matterId) });
    },
  });
}
