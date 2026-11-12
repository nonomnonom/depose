import { useState } from 'react';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { PageLoading } from '~/features/lib/components/PageLoading';
import { PageHeader } from '~/features/layout/PageHeader';
import { formatRelativeDate } from '~/features/lib/format/date';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '~/features/lib/notifications/queries';

export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const list = useNotifications({ unreadOnly, limit: 50 });
  const unread = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = list.data?.items ?? [];
  const count = unread.data ?? 0;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Reviews, mentions, and jobs that need you."
        actions={
          count > 0 ? (
            <Button
              variant="outline"
              size="sm"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-1" role="group" aria-label="Filter notifications">
        <Button
          size="sm"
          variant={unreadOnly ? 'ghost' : 'secondary'}
          onClick={() => setUnreadOnly(false)}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={unreadOnly ? 'secondary' : 'ghost'}
          onClick={() => setUnreadOnly(true)}
        >
          Unread{count > 0 ? ` (${count})` : ''}
        </Button>
      </div>

      {list.isPending ? (
        <PageLoading />
      ) : list.isError ? (
        <div className="rounded-lg border border-border px-4 py-10 text-center text-sm text-muted-foreground">
          Notifications could not be loaded.{' '}
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => void list.refetch()}
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-14 text-center">
          <p className="text-sm font-medium">{unreadOnly ? 'You are all caught up' : 'No notifications yet'}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadOnly
              ? 'Nothing unread right now.'
              : 'Review requests, mentions, and background job results appear here.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-accent/40"
              onClick={() => {
                if (!item.readAt) markRead.mutate(item.id);
              }}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <span className={item.readAt ? 'text-sm' : 'text-sm font-medium'}>
                  {item.title}
                </span>
                {!item.readAt ? (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    Unread
                  </Badge>
                ) : null}
              </div>
              {item.body ? (
                <p className="text-sm text-muted-foreground text-pretty">{item.body}</p>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {formatRelativeDate(item.createdAt)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
