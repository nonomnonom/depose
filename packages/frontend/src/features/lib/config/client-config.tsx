import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@depose/ui/components/button';
import { ApiError } from '~/features/lib/api/errors';
import { unwrapData } from '~/features/lib/api/client';
import { BootScreen } from '~/features/lib/components/BootScreen';
import { queryKeys } from '~/features/lib/query/keys';
import { tenantControllerGetTenant } from '~/generated/endpoints';
import type { TenantInfo } from '~/types';

/**
 * UI-facing feature flags derived from the server tenant config. Scenes read
 * these instead of re-implementing config logic in each page.
 */
export interface ClientFeatures {
  auth: {
    /** Email + password form can be used. */
    passwordLogin: boolean;
    /** A user can create an account from the signup page. */
    selfSignup: boolean;
    /** An SSO provider is configured; show the SSO action. */
    ssoLogin: boolean;
    /** Password login is disabled, so SSO is the only way in. */
    ssoRequired: boolean;
    /** Accounts must verify their email before logging in. */
    emailVerification: boolean;
    /** Mail delivery is configured, so verification/reset mail can be sent. */
    mailConfigured: boolean;
  };
  ai: {
    /** A model provider is configured; otherwise Chats uses grounded retrieval only. */
    enabled: boolean;
  };
  mcpServer: {
    /** Depose itself serves a read-only MCP endpoint. */
    enabled: boolean;
  };
  setup: {
    /** This host still has to create the first firm. */
    required: boolean;
    /** The request host is the instance bootstrap host. */
    bootstrapHost: boolean;
  };
}

export interface ClientConfig extends TenantInfo {
  /** Firm name with the product fallback applied. */
  firmName: string;
  features: ClientFeatures;
}

const ClientConfigContext = createContext<ClientConfig | null>(null);

function toClientConfig(tenant: TenantInfo): ClientConfig {
  return {
    ...tenant,
    firmName: tenant.firm?.name ?? 'Depose',
    features: {
      auth: {
        passwordLogin: !tenant.auth.forceSso,
        selfSignup: tenant.auth.allowSelfSignup && !tenant.auth.forceSso,
        ssoLogin: tenant.auth.ssoEnabled,
        ssoRequired: tenant.auth.forceSso && tenant.auth.ssoEnabled,
        emailVerification: tenant.auth.requireEmailVerification,
        mailConfigured: tenant.auth.mailConfigured,
      },
      ai: {
        enabled: Boolean(tenant.auth.aiEnabled),
      },
      mcpServer: {
        enabled: Boolean(tenant.auth.mcpServerEnabled),
      },
      setup: {
        required: tenant.requiresSetup,
        bootstrapHost: tenant.isBootstrapHost,
      },
    },
  };
}

async function fetchClientConfig(): Promise<ClientConfig> {
  return toClientConfig(unwrapData(await tenantControllerGetTenant()));
}

export function ClientConfigProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: queryKeys.clientConfig,
    queryFn: fetchClientConfig,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  if (query.isPending) {
    return <BootScreen label="Loading instance configuration..." />;
  }

  if (query.isError || !query.data) {
    const error = query.error;
    const message =
      error instanceof ApiError && error.isNetworkError
        ? 'Could not reach the server. Check your connection and try again.'
        : error instanceof ApiError
          ? error.message
          : 'Instance configuration could not be loaded.';

    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-border bg-card p-5">
          <p className="text-sm font-medium">Could not load configuration</p>
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button variant="outline" size="sm" className="self-start" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ClientConfigContext.Provider value={query.data}>
      {children}
    </ClientConfigContext.Provider>
  );
}

export function useClientConfig(): ClientConfig {
  const value = useContext(ClientConfigContext);
  if (!value) {
    throw new Error('useClientConfig must be used inside ClientConfigProvider');
  }
  return value;
}

export function useAuthFeatures(): ClientFeatures['auth'] {
  return useClientConfig().features.auth;
}

