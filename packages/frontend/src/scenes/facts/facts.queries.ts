import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  factsControllerConfirm,
  factsControllerCreate,
  factsControllerList,
  factsControllerReject,
} from '~/generated/endpoints';
import type {
  FactsControllerCreateBody,
  FactsControllerListStatus,
} from '~/generated/schemas';
import { unwrapData } from '~/lib/api/client';

export interface FactFilters {
  q?: string;
  status?: FactsControllerListStatus;
}

const factsKey = (matterId: string, filters: FactFilters) =>
  ['matter', matterId, 'facts', filters] as const;

export function useFacts(matterId: string, filters: FactFilters) {
  return useInfiniteQuery({
    queryKey: factsKey(matterId, filters),
    queryFn: async ({ pageParam }) =>
      unwrapData(
        await factsControllerList(matterId, {
          limit: 30,
          cursor: pageParam ?? undefined,
          q: filters.q,
          status: filters.status,
        }),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: Boolean(matterId),
  });
}

function useInvalidateFacts(matterId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['matter', matterId, 'facts'] });
}

export function useCreateFact(matterId: string) {
  const invalidate = useInvalidateFacts(matterId);
  return useMutation({
    mutationFn: async (input: FactsControllerCreateBody) =>
      unwrapData(await factsControllerCreate(matterId, input)).fact,
    onSuccess: invalidate,
  });
}

export function useConfirmFact(matterId: string) {
  const invalidate = useInvalidateFacts(matterId);
  return useMutation({
    mutationFn: async (id: string) =>
      unwrapData(await factsControllerConfirm(matterId, id)).fact,
    onSuccess: invalidate,
  });
}

export function useRejectFact(matterId: string) {
  const invalidate = useInvalidateFacts(matterId);
  return useMutation({
    mutationFn: async (id: string) =>
      unwrapData(await factsControllerReject(matterId, id)).fact,
    onSuccess: invalidate,
  });
}
