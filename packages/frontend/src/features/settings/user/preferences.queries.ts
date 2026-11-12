import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '~/features/lib/api/client';

export interface UserPreferences {
  locale: 'en' | 'id';
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  density: 'compact' | 'comfortable' | 'spacious';
  notifications: { email: boolean; inApp: boolean; digest: boolean };
}

const preferencesKey = ['me', 'preferences'] as const;

export function useUserPreferences() {
  return useQuery({
    queryKey: preferencesKey,
    queryFn: () => api.get<{ preferences: UserPreferences }>('/api/v1/me/preferences'),
  });
}

export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<UserPreferences>) =>
      api.patch<{ preferences: UserPreferences }>('/api/v1/me/preferences', patch),
    onSuccess: (data) => {
      queryClient.setQueryData(preferencesKey, data);
    },
  });
}
