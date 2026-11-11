import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  publicInvitationsControllerAccept,
  publicInvitationsControllerGet,
} from '~/generated/endpoints';
import { unwrapData } from '~/lib/api/client';

const invitationKey = (token: string) => ['invitation', token] as const;

export function useInvitation(token: string) {
  return useQuery({
    queryKey: invitationKey(token),
    queryFn: async () => unwrapData(await publicInvitationsControllerGet(token)).invitation,
    retry: false,
  });
}

export function useAcceptInvitation(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrapData(await publicInvitationsControllerAccept(token)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invitationKey(token) });
    },
  });
}
