import { useQuery } from '@tanstack/react-query';
import { tenantControllerGetTenant } from '~/lib/api/generated/endpoints';
import { queryKeys } from '~/lib/query/keys';
import type { TenantInfo } from '~/features/auth/types';

async function fetchTenant(): Promise<TenantInfo> {
  const response = await tenantControllerGetTenant();
  return response.data as unknown as TenantInfo;
}

export function useTenantQuery() {
  return useQuery({
    queryKey: queryKeys.tenant,
    queryFn: fetchTenant,
    retry: false,
    staleTime: 30_000,
  });
}