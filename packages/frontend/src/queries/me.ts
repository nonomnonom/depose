import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { meControllerMe } from '~/lib/api/generated/endpoints';
import { queryKeys } from '~/lib/query/keys';
import type { Me } from '~/features/auth/types';

async function fetchMe(): Promise<Me> {
  const response = await meControllerMe();
  return response.data as unknown as Me;
}

export function useMeQuery() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchMe,
    retry: false,
    staleTime: 30_000,
  });
}

export function invalidateMe(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.me });
}