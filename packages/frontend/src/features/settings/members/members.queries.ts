import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  invitationsControllerCreate,
  invitationsControllerList,
  invitationsControllerResend,
  invitationsControllerRevoke,
  membersControllerList,
  membersControllerRemove,
  membersControllerUpdateRole,
} from '~/generated/endpoints';
import type {
  InvitationsControllerCreateBody,
  MembersControllerUpdateRoleBody,
} from '~/generated/schemas';
import { unwrapData } from '~/features/lib/api/client';

const membersKey = ['firm', 'members'] as const;
const invitationsKey = ['firm', 'invitations'] as const;

export function useFirmMembers() {
  return useQuery({
    queryKey: membersKey,
    queryFn: async () => unwrapData(await membersControllerList()).items,
  });
}

export function useFirmInvitations() {
  return useQuery({
    queryKey: invitationsKey,
    queryFn: async () => unwrapData(await invitationsControllerList()).items,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: InvitationsControllerCreateBody) =>
      unwrapData(await invitationsControllerCreate(input)).invitation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invitationsKey });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrapData(await invitationsControllerResend(id)).invitation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invitationsKey });
    },
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrapData(await invitationsControllerRevoke(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invitationsKey });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: MembersControllerUpdateRoleBody }) =>
      unwrapData(await membersControllerUpdateRole(id, input)).member,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: membersKey });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrapData(await membersControllerRemove(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: membersKey });
    },
  });
}
