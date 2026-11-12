import { useEffect, useState } from 'react';
import { Button } from '@depose/ui/components/button';
import { Label } from '@depose/ui/components/label';
import { PageHeader } from '~/layout/PageHeader';
import { Skeleton } from '@depose/ui/components/skeleton';
import { useTheme, type Theme } from '~/layout/ThemeProvider';
import { useUpdateUserPreferences, useUserPreferences, type UserPreferences } from './preferences.queries';

const THEMES: { value: Theme; label: string; detail: string }[] = [
  { value: 'light', label: 'Light', detail: 'Paper and ink.' },
  { value: 'dark', label: 'Dark', detail: 'Low light review.' },
  { value: 'system', label: 'System', detail: 'Follow the device.' },
];

const DENSITIES: { value: UserPreferences['density']; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'spacious', label: 'Spacious' },
];

export function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const preferences = useUserPreferences();
  const update = useUpdateUserPreferences();
  const [density, setDensity] = useState<UserPreferences['density']>('comfortable');
  const [locale, setLocale] = useState<UserPreferences['locale']>('en');
  const [timezone, setTimezone] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!preferences.data) return;
    setDensity(preferences.data.preferences.density);
    setLocale(preferences.data.preferences.locale);
    setTimezone(preferences.data.preferences.timezone);
  }, [preferences.data]);

  if (preferences.isPending) return <Skeleton className="h-72 w-full max-w-xl" />;
  if (preferences.isError) {
    return (
      <p className="text-sm text-destructive">
        Preferences could not be loaded. Reload the page to try again.
      </p>
    );
  }

  const save = () => {
    update.mutate(
      { density, locale, timezone: timezone.trim() || 'UTC', theme },
      { onSuccess: () => setSaved(true) },
    );
  };

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <PageHeader
        title="Appearance"
        description="How the workspace looks on this device and how dates and times are written."
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Theme</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {THEMES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setTheme(option.value);
                setSaved(false);
              }}
              aria-pressed={theme === option.value}
              className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                theme === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/40'
              }`}
            >
              <p className="text-sm font-medium">{option.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{option.detail}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-5">
        <div className="space-y-1.5">
          <Label htmlFor="density">Density</Label>
          <select
            id="density"
            value={density}
            onChange={(event) => {
              setDensity(event.target.value as UserPreferences['density']);
              setSaved(false);
            }}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
          >
            {DENSITIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Density is stored on your account for consistency across devices.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="locale">Language</Label>
            <select
              id="locale"
              value={locale}
              onChange={(event) => {
                setLocale(event.target.value as UserPreferences['locale']);
                setSaved(false);
              }}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
            >
              <option value="en">English</option>
              <option value="id">Bahasa Indonesia</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Time zone</Label>
            <input
              id="timezone"
              value={timezone}
              onChange={(event) => {
                setTimezone(event.target.value);
                setSaved(false);
              }}
              placeholder="Europe/London"
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <div className="flex min-h-8 flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
        {update.isError ? (
          <p className="mr-auto text-sm text-destructive">
            {update.error instanceof Error ? update.error.message : 'Could not save preferences.'}
          </p>
        ) : null}
        {saved ? <p className="mr-auto text-sm text-muted-foreground">Preferences saved.</p> : null}
        <Button onClick={save} disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save appearance'}
        </Button>
      </div>
    </div>
  );
}
