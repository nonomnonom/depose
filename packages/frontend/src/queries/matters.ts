import { useQuery } from '@tanstack/react-query';
import { mattersControllerList } from '~/lib/api/generated/endpoints';
import { queryKeys } from '~/lib/query/keys';
import type { Matter } from '~/lib/types';

interface MattersResponse {
  items: Matter[];
}

async function fetchMatters(): Promise<MattersResponse> {
  const response = await mattersControllerList();
  return response.data as unknown as MattersResponse;
}

export function useMattersQuery(filter: { status?: string; q?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.matters(filter),
    queryFn: fetchMatters,
    retry: false,
    staleTime: 30_000,
  });
}

export function mattersQueryKey(filter: { status?: string; q?: string } = {}) {
  return queryKeys.matters(filter);
}