import { Link } from 'react-router-dom';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@depose/ui/components/dropdown-menu';
import { Skeleton } from '@depose/ui/components/skeleton';
import { Bell } from '@coolicons/react';
import { formatRelativeDate } from '~/features/lib/format/date';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '~/features/lib/notifications/queries';

export function NotificationsMenu() {
  const unread = useUnreadNotificationCount();
  const latest = useNotifications({ limit: 5 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const count = unread.data ?? 0;
  const items = latest.data?.items ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
          />
        }
      >
        <Bell className="size-4" />
        {count > 0 ? (
          <Badge
            variant="default"
            className="absolute -top-0.5 -right-0.5 h-4 min-w-4 justify-center px-1 text-[10px] leading-none"
          >
            {count > 9 ? '9+' : count}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {count > 0 ? (
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              Mark all read
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator />

        {latest.isPending ? (
          <div className="space-y-2 px-2 py-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="px-2 py-8 text-center text-sm text-muted-foreground">
            Nothing needs your attention.
          </div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="flex flex-col items-start gap-0.5 py-2"
              render={<Link to="/notifications" />}
              onClick={() => {
                if (!item.readAt) markRead.mutate(item.id);
              }}
            >
              <span className={item.readAt ? 'text-sm' : 'text-sm font-medium'}>
                {item.title}
              </span>
              <span className="line-clamp-2 text-xs text-muted-foreground">
                {item.body ?? formatRelativeDate(item.createdAt)}
              </span>
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to="/notifications" />}>
          Open notification inbox
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
