import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Folder, Layers, Scale } from '@coolicons/react';

import { useScene } from '~/features/sceneLogic';
import { urls } from '~/features/urls';
import { useSession } from '~/features/lib/auth/session';
import { useToday } from './today.queries';
import type { TodayControllerOverview200JumpBackInItem } from '~/generated/schemas';

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

function greetingFor(hour: number): string {
  if (hour < 5) return 'Burning the midnight oil.';
  if (hour < 12) return 'Good morning.';
  if (hour < 18) return 'Good afternoon.';
  return 'Good evening.';
}

/** Matter-scoped home (matter = project — PostHog Today inside a project). */
export function MatterHomePage() {
  const { sceneParams } = useScene();
  const { me } = useSession();
  const matterId = sceneParams.params.matterId ?? '';
  const today = useToday(matterId || undefined);

  const firstName = me?.user.name?.split(' ')[0] ?? 'there';
  const now = new Date();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <section aria-label="Today" className="flex flex-col gap-1">
        <h1 className="text-[21px] font-medium tracking-tight">
          {greetingFor(now.getHours())} {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">{DATE_FORMAT.format(now)}</p>
      </section>

      {today.isError ? (
        <p className="text-sm text-muted-foreground">
          The feed could not be loaded.{' '}
          <button type="button" className="text-foreground underline" onClick={() => void today.refetch()}>
            Retry
          </button>
        </p>
      ) : null}

      {today.data && today.data.forYou.length > 0 ? (
        <section aria-label="For you today" className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">For you today</h2>
          <ol className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {today.data.forYou.map((row) => (
              <li key={`${row.type}-${row.id}`}>
                <TodayRow
                  to={rowHref(row)}
                  icon={<RowIcon type={row.type} />}
                  title={row.title}
                  meta={row.reason}
                />
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {today.data && today.data.chats.length > 0 ? (
        <section aria-label="Recent chats" className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Chats</h2>
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {today.data.chats.slice(0, 4).map((chat) => (
              <li key={chat.threadId}>
                <TodayRow
                  to={urls.matterChats(chat.matterId)}
                  icon={<SparkleIcon />}
                  title={chat.title ?? 'New chat'}
                  meta={relativeTime(chat.updatedAt)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {today.data && today.data.jumpBackIn.length > 0 ? (
        <section aria-label="Jump back in" className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Jump back in</h2>
          <ul className="flex flex-col gap-1">
            {today.data.jumpBackIn.map((row) => (
              <li key={`${row.type}-${row.id}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/60">
                <span className="text-muted-foreground">
                  <RowIcon type={row.type} />
                </span>
                <Link to={rowHref(row)} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                  {row.title}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(row.updatedAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {today.data && today.data.forYou.length === 0 && today.data.jumpBackIn.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing needs you yet. Upload documents or record facts — what matters shows up here.
          </p>
          <Link
            to={urls.matterDocuments(matterId)}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Go to documents <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </section>
      ) : null}
    </div>
  );
}

function rowHref(row: TodayControllerOverview200JumpBackInItem): string {
  if (row.type === 'document') return urls.matterDocuments(row.id);
  if (row.type === 'report') return urls.matterReports(row.id);
  if (row.type === 'subset') return urls.matterSubsets(row.id);
  return urls.matterHome(row.id);
}

function RowIcon({ type }: { type: TodayControllerOverview200JumpBackInItem['type'] }): React.ReactNode {
  if (type === 'document') return <FileText className="size-4" aria-hidden="true" />;
  if (type === 'report') return <FileText className="size-4" aria-hidden="true" />;
  if (type === 'subset') return <Layers className="size-4" aria-hidden="true" />;
  return <Scale className="size-4" aria-hidden="true" />;
}

function SparkleIcon(): React.ReactNode {
  return <Folder className="size-4" aria-hidden="true" />;
}

function TodayRow({
  to,
  icon,
  title,
  meta,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  meta: string;
}): React.ReactNode {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{meta}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
