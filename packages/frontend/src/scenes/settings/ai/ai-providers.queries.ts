import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  modelGatewayControllerCreate,
  modelGatewayControllerList,
  modelGatewayControllerRemove,
  modelGatewayControllerTest,
} from '~/generated/endpoints';
import type { ModelGatewayControllerCreateBody } from '~/generated/schemas';
import { api, unwrapData } from '~/lib/api/client';

const key = ['firm', 'ai', 'providers'] as const;

export function useAiProviders() {
  return useQuery({
    queryKey: key,
    queryFn: async () => unwrapData(await modelGatewayControllerList()).items,
  });
}

export interface RouteStatus {
  routeKey: string;
  capability: string;
  provider: string;
  model: string;
  available: boolean;
  threshold?: number;
  fallbackEnabled?: boolean;
}

export function useAiRoutes() {
  return useQuery({
    queryKey: ['firm', 'ai', 'routes'],
    queryFn: () =>
      api.get<{ decision: RouteStatus; extraction: RouteStatus }>('/api/v1/firm/ai/providers/routes'),
  });
}

export function useCreateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ModelGatewayControllerCreateBody) =>
      unwrapData(await modelGatewayControllerCreate(body)).provider,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useTestProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrapData(await modelGatewayControllerTest(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useRemoveProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrapData(await modelGatewayControllerRemove(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
