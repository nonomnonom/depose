import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  factsControllerConfirm,
  factsControllerCreate,
  factsControllerGet,
  factsControllerList,
  factsControllerReject,
} from '~/generated/endpoints';
import type {
  FactsControllerCreateBody,
  FactsControllerListStatus,
} from '~/generated/schemas';
import { api, unwrapData } from '~/lib/api/client';
import { queryKeys } from '~/lib/query/keys';

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
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['matter', matterId, 'facts'] });
    void queryClient.invalidateQueries({ queryKey: [...queryKeys.matter(matterId), 'overview'] });
  };
}

export function useFactDetail(matterId: string, factId: string | null) {
  return useQuery({
    queryKey: ['matter', matterId, 'fact', factId],
    queryFn: async () => unwrapData(await factsControllerGet(matterId, factId!)).fact,
    enabled: Boolean(matterId && factId),
  });
}

export interface ExtractionAccepted {
  accepted: boolean;
  jobIds: string[];
  message?: string;
}

export function useRunExtraction(matterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documentId?: string) =>
      api.post<ExtractionAccepted>(`/api/v1/matters/${matterId}/facts/extract`, {
        ...(documentId ? { documentId } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['matter', matterId, 'documents'] });
      void queryClient.invalidateQueries({ queryKey: ['matter', matterId, 'facts'] });
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.matter(matterId), 'overview'] });
    },
  });
}

export interface JobState {
  id: string;
  status: string;
  stage: string | null;
  progress: number;
  result: Record<string, unknown> | null;
  error: { code: string; message: string | null } | null;
}

export function useJob(jobId: string | null) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.get<JobState>(`/api/v1/jobs/${jobId}`),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const state = query.state.data?.status;
      return state === 'succeeded' || state === 'failed' || state === 'dead' ? false : 1500;
    },
  });
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

