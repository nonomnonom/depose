import { useState } from 'react';
import { Button } from '@depose/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@depose/ui/components/card';
import { SaveButton } from '~/lib/save-button';
import { queryClient } from '~/lib/query/client';
import { queryKeys } from '~/lib/query/keys';
import { ApiError } from '~/lib/api/errors';
import { firmsControllerUpdate } from '~/generated/endpoints';
import { unwrapData } from '~/lib/api/client';
import { FirmsControllerUpdateBodyPrimaryLanguage, FirmDomainDto, FirmDomainDtoStatus, FirmDomainDtoSslStatus } from '~/generated/schemas';
import { useSession } from '~/lib/auth/session';
import { PageHeader } from '~/layout/PageHeader';

const LANG_OPTIONS = [
  { value: FirmsControllerUpdateBodyPrimaryLanguage.en, label: 'English' },
];

export function FirmSettingsResourcePage() {
  const { me } = useSession();
  const [form, setForm] = useState({
    name: me?.firm?.name ?? '',
    primaryLanguage: me?.firm?.primaryLanguage ?? 'en',
    jurisdiction: me?.firm?.jurisdiction ?? '',
    defaultTimezone: me?.firm?.defaultTimezone ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      unwrapData(await firmsControllerUpdate({
        name: form.name.trim(),
        primaryLanguage: form.primaryLanguage,
        jurisdiction: form.jurisdiction.trim() || undefined,
        defaultTimezone: form.defaultTimezone.trim(),
      }));
      queryClient.setQueryData(queryKeys.me, (old: any) => ({
        ...(old ?? {}),
        firm: { ...(old?.firm ?? {}), name: form.name, primaryLanguage: form.primaryLanguage },
      }));
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save.');
    } finally {
      setLoading(false);
    }
  };

  // If there's no firm yet, show setup hint
  if (!me?.firm) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title="Firm" description="General settings for your firm." />
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Firm not created yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No firm configured in this instance yet. Create the first firm to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Firm" description="General settings for your firm." />

      {saved && (
        <div className="mb-4 rounded-md border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
          Changes saved.
        </div>
      )}

      <Card className="mt-4">          <CardHeader>
            <CardTitle className="text-base">Basic information</CardTitle>
          </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="firm-name" className="text-sm font-medium">Firm name</label>
            <input
              id="firm-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring/50"
              placeholder="Your firm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="firm-language" className="text-sm font-medium">Primary language</label>
            <select
              id="firm-language"
              value={form.primaryLanguage}
              onChange={(e) => setForm((f) => ({ ...f, primaryLanguage: e.target.value as 'id' | 'en' }))}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring/50"
            >
              {LANG_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="firm-jurisdiction" className="text-sm font-medium">Jurisdiction</label>
            <input
              id="firm-jurisdiction"
              type="text"
              value={form.jurisdiction}
              onChange={(e) => setForm((f) => ({ ...f, jurisdiction: e.target.value }))}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring/50"
              placeholder="e.g. US"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="firm-timezone" className="text-sm font-medium">Default timezone</label>
            <input
              id="firm-timezone"
              type="text"
              value={form.defaultTimezone}
              onChange={(e) => setForm((f) => ({ ...f, defaultTimezone: e.target.value }))}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring/50"
              placeholder="UTC"
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-end gap-2">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        <SaveButton save={handleSave} loading={loading}>
          Save changes
        </SaveButton>
      </div>
    </div>
  );
}
