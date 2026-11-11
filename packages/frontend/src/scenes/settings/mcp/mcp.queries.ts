import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  mcpControllerCreate,
  mcpControllerList,
  mcpControllerRemove,
  mcpControllerTest,
} from '~/generated/endpoints';
import type { McpControllerCreateBody } from '~/generated/schemas';
import { unwrapData } from '~/lib/api/client';

const mcpKey = ['firm', 'mcp'] as const;

export function useMcpServers() {
  return useQuery({
    queryKey: mcpKey,
    queryFn: async () => unwrapData(await mcpControllerList()).items,
  });
}

export function useCreateMcpServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: McpControllerCreateBody) =>
      unwrapData(await mcpControllerCreate(input)).server,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mcpKey });
    },
  });
}

export function useTestMcpServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrapData(await mcpControllerTest(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mcpKey });
    },
  });
}

export function useRemoveMcpServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrapData(await mcpControllerRemove(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mcpKey });
    },
  });
}
