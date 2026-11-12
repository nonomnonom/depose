import { useQuery } from '@tanstack/react-query';

import { mattersControllerGet } from '~/generated/endpoints';
import { unwrapData } from '~/features/lib/api/client';
import { queryKeys } from '~/features/lib/query/keys';

/** Shared matter context for every matter scene (PostHog `scenes/projectLogic.ts`). */
export function useMatter(matterId: string) {
  return useQuery({
    queryKey: queryKeys.matter(matterId),
    queryFn: async () => unwrapData(await mattersControllerGet(matterId)).matter,
    enabled: Boolean(matterId),
    retry: false,
  });
}
