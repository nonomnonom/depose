export interface MatterFilters {
  status?: string;
  q?: string;
  limit?: number;
}

export const queryKeys = {
  clientConfig: ['client-config'] as const,
  me: ['me'] as const,
  permissions: ['me', 'permissions'] as const,
  onboarding: ['onboarding'] as const,
  matters: (filters: MatterFilters = {}) => ['matters', filters] as const,
  matter: (id: string) => ['matter', id] as const,
  notifications: ['notifications'] as const,
  firmDomains: ['firm', 'domains'] as const,
};
