import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  documentsControllerList,
  documentsControllerRemove,
  documentsControllerReprocess,
  documentsControllerUpload,
} from '~/generated/endpoints';
import type {
  DocumentsControllerListParams,
  DocumentsControllerListStatus,
} from '~/generated/schemas';
import { unwrapData } from '~/lib/api/client';

export interface DocumentFilters {
  q?: string;
  status?: DocumentsControllerListStatus;
}

const documentsKey = (matterId: string, filters: DocumentFilters) =>
  ['matter', matterId, 'documents', filters] as const;

export function useDocuments(matterId: string, filters: DocumentFilters) {
  return useInfiniteQuery({
    queryKey: documentsKey(matterId, filters),
    queryFn: async ({ pageParam }) =>
      unwrapData(
        await documentsControllerList(matterId, {
          limit: 30,
          cursor: pageParam ?? undefined,
          q: filters.q,
          status: filters.status,
        } satisfies DocumentsControllerListParams),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: Boolean(matterId),
    refetchInterval: (query) => {
      const pages = query.state.data?.pages ?? [];
      const processing = pages.some((page) =>
        page.items.some(
          (document) =>
            document.status === 'queued' || document.status === 'processing',
        ),
      );
      return processing ? 2_000 : false;
    },
  });
}

export function useUploadDocument(matterId: string, _filters: DocumentFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) =>
      unwrapData(
        await documentsControllerUpload(matterId, file, { fileName: file.name }),
      ).document,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['matter', matterId, 'documents'] });
      void queryClient.invalidateQueries({ queryKey: ['matter', matterId, 'overview'] });
    },
  });
}

export function useDeleteDocument(matterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrapData(await documentsControllerRemove(matterId, id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['matter', matterId, 'documents'] });
      void queryClient.invalidateQueries({ queryKey: ['matter', matterId, 'overview'] });
    },
  });
}

export function useReprocessDocument(matterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrapData(await documentsControllerReprocess(matterId, id)).document,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['matter', matterId, 'documents'] });
      void queryClient.invalidateQueries({ queryKey: ['matter', matterId, 'overview'] });
    },
  });
}

