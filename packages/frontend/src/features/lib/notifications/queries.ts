import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  notificationsControllerList,
  notificationsControllerMarkAllRead,
  notificationsControllerMarkRead,
  notificationsControllerUnreadCount,
} from '~/generated/endpoints';
import type { NotificationsControllerListParams } from '~/generated/schemas';
import { unwrapData } from '~/features/lib/api/client';

const listKey = (params: NotificationsControllerListParams) =>
  ['notifications', 'list', params] as const;
const unreadKey = ['notifications', 'unread'] as const;

export function useNotifications(params: NotificationsControllerListParams = {}) {
  return useQuery({
    queryKey: listKey(params),
    queryFn: async () => unwrapData(await notificationsControllerList(params)),
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: unreadKey,
    queryFn: async () => unwrapData(await notificationsControllerUnreadCount()).count,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrapData(await notificationsControllerMarkRead(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrapData(await notificationsControllerMarkAllRead()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
