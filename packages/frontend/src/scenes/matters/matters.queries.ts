import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mattersControllerCreate, mattersControllerList } from '~/generated/endpoints';
import type { MattersControllerCreateBody, MattersControllerListStatus } from '~/generated/schemas';
import { unwrapData } from '~/lib/api/client';
import { queryKeys } from '~/lib/query/keys';

export interface MatterFilters {
  q?: string;
  status?: MattersControllerListStatus;
}

export function useMatters(filters: MatterFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.matters(filters),
    queryFn: async ({ pageParam }) =>
      unwrapData(
        await mattersControllerList({
          limit: 20,
          cursor: pageParam ?? undefined,
          q: filters.q,
          status: filters.status,
        }),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
}

export function useCreateMatter(filters: MatterFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MattersControllerCreateBody) =>
      unwrapData(await mattersControllerCreate(input)).matter,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.matters(filters) });
    },
  });
}
