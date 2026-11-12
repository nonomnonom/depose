import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  mcpRegistryControllerCreate,
  mcpRegistryControllerList,
  mcpRegistryControllerRemove,
  mcpRegistryControllerTest,
} from '~/generated/endpoints';
import type { McpRegistryControllerCreateBody } from '~/generated/schemas';
import { unwrapData } from '~/lib/api/client';

const mcpKey = ['firm', 'mcp'] as const;

export function useMcpServers() {
  return useQuery({
    queryKey: mcpKey,
    queryFn: async () => unwrapData(await mcpRegistryControllerList()).items,
  });
}

export function useCreateMcpServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: McpRegistryControllerCreateBody) =>
      unwrapData(await mcpRegistryControllerCreate(input)).server,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mcpKey });
    },
  });
}

export function useTestMcpServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrapData(await mcpRegistryControllerTest(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mcpKey });
    },
  });
}

export function useRemoveMcpServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrapData(await mcpRegistryControllerRemove(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mcpKey });
    },
  });
}
