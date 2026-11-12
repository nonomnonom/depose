import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { todayControllerOverview, todayControllerRecordRecent } from '~/generated/endpoints';
import { unwrapData } from '~/features/lib/api/client';

/**
 * PostHog Today feed. Matter-scoped (`?matterId=`) is the primary surface:
 * matter = project, so Home lives inside the matter context.
 */
export function useToday(matterId?: string) {
  return useQuery({
    queryKey: ['today', matterId ?? 'firm'],
    queryFn: async () => unwrapData(await todayControllerOverview({ matterId })),
    enabled: matterId === undefined || Boolean(matterId),
    staleTime: 30_000,
  });
}

export function useRecordRecentMatter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (matterId: string) =>
      unwrapData(await todayControllerRecordRecent({ resourceId: matterId, resourceType: 'matter' })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}
