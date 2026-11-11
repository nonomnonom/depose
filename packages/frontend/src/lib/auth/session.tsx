import { createContext, useContext, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { meControllerMe, meControllerPermissions } from '~/generated/endpoints';
import { signOut } from '~/lib/auth/api';
import { unwrapData } from '~/lib/api/client';
import { queryKeys } from '~/lib/query/keys';
import type { Me } from '~/types';

interface SessionValue {
  me: Me | null;
  isLoading: boolean;
  permissions: string[];
  permissionsLoading: boolean;
  isAuthenticated: boolean;
  can: (action: string) => boolean;
}

const SessionContext = createContext<SessionValue | null>(null);

async function fetchMe(): Promise<Me> {
  return unwrapData(await meControllerMe());
}

async function fetchPermissions(): Promise<string[]> {
  return unwrapData(await meControllerPermissions()).permissions;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchMe,
    retry: false,
    staleTime: 30_000,
  });
  const me = meQuery.data ?? null;

  const permissionsQuery = useQuery({
    queryKey: queryKeys.permissions,
    queryFn: fetchPermissions,
    enabled: Boolean(me?.firm),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const permissions = permissionsQuery.data ?? [];

  const value: SessionValue = {
    me,
    isLoading: meQuery.isPending,
    permissions,
    permissionsLoading: permissionsQuery.isLoading,
    isAuthenticated: Boolean(me),
    can: (action) => permissions.includes(action),
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return value;
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: signOut,
    onSettled: () => {
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
}
