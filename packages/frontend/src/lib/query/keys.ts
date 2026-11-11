export const queryKeys = {
  me: ['me'] as const,
  tenant: ['tenant'] as const,
  onboarding: ['onboarding'] as const,
  matters: (filter: { status?: string; q?: string } = {}) => ['matters', filter] as const,
  firmDomains: ['firm', 'domains'] as const,
};
