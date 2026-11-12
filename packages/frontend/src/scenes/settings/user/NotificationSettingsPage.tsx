import { useEffect, useState } from 'react';
import { Button } from '@depose/ui/components/button';
import { Skeleton } from '@depose/ui/components/skeleton';
import { PageHeader } from '~/layout/PageHeader';
import { useUpdateUserPreferences, useUserPreferences } from './preferences.queries';

interface ToggleRow {
  key: 'email' | 'inApp' | 'digest';
  title: string;
  detail: string;
}

const ROWS: ToggleRow[] = [
  {
    key: 'inApp',
    title: 'In-app notifications',
    detail: 'Job finished, review assigned, and conflicts detected.',
  },
  {
    key: 'email',
    title: 'Email notifications',
    detail: 'The same events, sent to your firm email address.',
  },
  {
    key: 'digest',
    title: 'Weekly digest',
    detail: 'One summary of matter activity each week. Nothing urgent waits for it.',
  },
];

export function NotificationSettingsPage() {
  const preferences = useUserPreferences();
  const update = useUpdateUserPreferences();
  const [values, setValues] = useState({ email: true, inApp: true, digest: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!preferences.data) return;
    setValues(preferences.data.preferences.notifications);
  }, [preferences.data]);

  if (preferences.isPending) return <Skeleton className="h-64 w-full max-w-xl" />;
  if (preferences.isError) {
    return (
      <p className="text-sm text-destructive">
        Notification preferences could not be loaded. Reload the page to try again.
      </p>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Choose what reaches you. Your firm controls the events; this only decides delivery."
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {ROWS.map((row) => (
            <li key={row.key} className="flex items-start justify-between gap-4 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">{row.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{row.detail}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={values[row.key]}
                aria-label={row.title}
                onClick={() => {
                  setValues((current) => ({ ...current, [row.key]: !current[row.key] }));
                  setSaved(false);
                }}
                className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
                  values[row.key] ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`absolute top-0.5 size-4 rounded-full bg-background shadow-sm transition-transform ${
                    values[row.key] ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex min-h-8 flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
        {update.isError ? (
          <p className="mr-auto text-sm text-destructive">
            {update.error instanceof Error ? update.error.message : 'Could not save preferences.'}
          </p>
        ) : null}
        {saved ? <p className="mr-auto text-sm text-muted-foreground">Preferences saved.</p> : null}
        <Button
          onClick={() => update.mutate({ notifications: values }, { onSuccess: () => setSaved(true) })}
          disabled={update.isPending}
        >
          {update.isPending ? 'Saving…' : 'Save notifications'}
        </Button>
      </div>
    </div>
  );
}
