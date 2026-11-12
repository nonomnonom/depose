import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  subsetsControllerCreate,
  subsetsControllerFacts,
  subsetsControllerGet,
  subsetsControllerList,
  subsetsControllerRemove,
  subsetsControllerUpdate,
} from '~/generated/endpoints';
import type {
  SubsetsControllerCreateBody,
  SubsetsControllerUpdateBody,
} from '~/generated/schemas';
import { unwrapData } from '~/features/lib/api/client';

const subsetsKey = (matterId: string) => ['matter', matterId, 'subsets'] as const;

export function useSubsets(matterId: string) {
  return useQuery({
    queryKey: subsetsKey(matterId),
    queryFn: async () => unwrapData(await subsetsControllerList(matterId)).items,
    enabled: Boolean(matterId),
  });
}

export function useSubset(matterId: string, subsetId: string | null) {
  return useQuery({
    queryKey: ['matter', matterId, 'subset', subsetId],
    queryFn: async () => unwrapData(await subsetsControllerGet(matterId, subsetId!)),
    enabled: Boolean(matterId && subsetId),
  });
}

export function useSubsetFacts(matterId: string, subsetId: string | null) {
  return useQuery({
    queryKey: ['matter', matterId, 'subset', subsetId, 'facts'],
    queryFn: async () =>
      unwrapData(await subsetsControllerFacts(matterId, subsetId!, { limit: 100 })).items,
    enabled: Boolean(matterId && subsetId),
  });
}

export function useCreateSubset(matterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: SubsetsControllerCreateBody) =>
      unwrapData(await subsetsControllerCreate(matterId, body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subsetsKey(matterId) });
    },
  });
}

export function useUpdateSubset(matterId: string, subsetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: SubsetsControllerUpdateBody) =>
      unwrapData(await subsetsControllerUpdate(matterId, subsetId, body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subsetsKey(matterId) });
      void queryClient.invalidateQueries({ queryKey: ['matter', matterId, 'subset', subsetId] });
    },
  });
}

export function useDeleteSubset(matterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (subsetId: string) =>
      unwrapData(await subsetsControllerRemove(matterId, subsetId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subsetsKey(matterId) });
    },
  });
}
