import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@depose/ui/components/button';
import { ApiError } from '~/lib/api/errors';
import { BootScreen } from '~/lib/components/BootScreen';
import { queryKeys } from '~/lib/query/keys';
import { tenantControllerGetTenant } from '~/generated/endpoints';
import type { TenantInfo } from '~/types';

interface ClientConfigValue {
  config: TenantInfo;
}

const ClientConfigContext = createContext<ClientConfigValue | null>(null);

async function fetchClientConfig(): Promise<TenantInfo> {
  const response = await tenantControllerGetTenant();
  return response.data;
}

export function ClientConfigProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: queryKeys.clientConfig,
    queryFn: fetchClientConfig,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  if (query.isPending) {
    return <BootScreen label="Memuat konfigurasi instance..." />;
  }

  if (query.isError || !query.data) {
    const error = query.error;
    const message =
      error instanceof ApiError && error.isNetworkError
        ? 'Server tidak dapat dihubungi. Periksa koneksi lalu coba lagi.'
        : error instanceof ApiError
          ? error.message
          : 'Konfigurasi instance tidak dapat dimuat.';

    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-border bg-card p-5">
          <p className="text-sm font-medium">Gagal memuat konfigurasi</p>
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button variant="outline" size="sm" className="self-start" onClick={() => void query.refetch()}>
            Coba lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ClientConfigContext.Provider value={{ config: query.data }}>
      {children}
    </ClientConfigContext.Provider>
  );
}

export function useClientConfig(): TenantInfo {
  const value = useContext(ClientConfigContext);
  if (!value) {
    throw new Error('useClientConfig must be used inside ClientConfigProvider');
  }
  return value.config;
}
