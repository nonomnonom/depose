import { useEffect, useState } from 'react';
import { Button } from '@depose/ui/components/button';
import { Input } from '@depose/ui/components/input';
import { Label } from '@depose/ui/components/label';
import { NativeSelect, NativeSelectOption } from '@depose/ui/components/native-select';
import { firmsControllerUpdate } from '~/generated/endpoints';
import type { FirmsControllerUpdateBodyPrimaryLanguage } from '~/generated/schemas';
import { ApiError } from '~/features/lib/api/errors';
import { unwrapData } from '~/features/lib/api/client';
import { queryClient } from '~/features/lib/query/client';
import { queryKeys } from '~/features/lib/query/keys';
import { useSession } from '~/features/lib/auth/session';
import { PageHeader } from '~/features/layout/PageHeader';
import { EmptyState } from '~/features/lib/components/EmptyState';

const LANGUAGES: { value: FirmsControllerUpdateBodyPrimaryLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'id', label: 'Bahasa Indonesia' },
];

export function FirmSettingsResourcePage() {
  const { me, can } = useSession();
  const firm = me?.firm;
  const [form, setForm] = useState({
    name: firm?.name ?? '',
    primaryLanguage: (firm?.primaryLanguage ?? 'en') as FirmsControllerUpdateBodyPrimaryLanguage,
    jurisdiction: firm?.jurisdiction ?? '',
    defaultTimezone: firm?.defaultTimezone ?? 'UTC',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!firm) return;
    setForm({
      name: firm.name,
      primaryLanguage: firm.primaryLanguage,
      jurisdiction: firm.jurisdiction,
      defaultTimezone: firm.defaultTimezone,
    });
    setSaved(false);
  }, [firm?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!firm) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Firm" description="General settings for your firm." />
        <EmptyState
          title="No firm configured"
          description="Create the first firm on this instance before changing firm settings."
        />
      </div>
    );
  }

  const canEdit = can('firm.update');
  const dirty =
    form.name !== firm.name ||
    form.primaryLanguage !== firm.primaryLanguage ||
    form.jurisdiction !== firm.jurisdiction ||
    form.defaultTimezone !== firm.defaultTimezone;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      unwrapData(
        await firmsControllerUpdate({
          name: form.name.trim(),
          primaryLanguage: form.primaryLanguage,
          jurisdiction: form.jurisdiction.trim() || undefined,
          defaultTimezone: form.defaultTimezone.trim(),
        }),
      );
      queryClient.setQueryData<Me>(queryKeys.me, (old) =>
        old
          ? {
              ...old,
              firm: old.firm
                ? {
                    ...old.firm,
                    name: form.name.trim(),
                    primaryLanguage: form.primaryLanguage,
                    jurisdiction: form.jurisdiction.trim(),
                    defaultTimezone: form.defaultTimezone.trim(),
                  }
                : old.firm,
            }
          : old,
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save firm settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <PageHeader title="Firm" description="General settings for your firm." />

      <form onSubmit={save} className="flex flex-col gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="firm-name">Firm name</Label>
          <Input
            id="firm-name"
            value={form.name}
            disabled={!canEdit}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Your firm"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firm-language">Primary language</Label>
            <NativeSelect
              id="firm-language"
              className="w-full"
              value={form.primaryLanguage}
              disabled={!canEdit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  primaryLanguage: event.target.value as FirmsControllerUpdateBodyPrimaryLanguage,
                }))
              }
            >
              {LANGUAGES.map((language) => (
                <NativeSelectOption key={language.value} value={language.value}>
                  {language.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="firm-timezone">Default timezone</Label>
            <Input
              id="firm-timezone"
              value={form.defaultTimezone}
              disabled={!canEdit}
              onChange={(event) =>
                setForm((current) => ({ ...current, defaultTimezone: event.target.value }))
              }
              placeholder="UTC"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="firm-jurisdiction">Jurisdiction</Label>
          <Input
            id="firm-jurisdiction"
            value={form.jurisdiction}
            disabled={!canEdit}
            onChange={(event) =>
              setForm((current) => ({ ...current, jurisdiction: event.target.value }))
            }
            placeholder="e.g. US, ID, SG"
          />
          <p className="text-xs text-muted-foreground">
            Used as the default for new matters. Leave blank for multi-jurisdiction firms.
          </p>
        </div>

        <div className="flex min-h-8 flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
          {error ? <p className="mr-auto text-sm text-destructive">{error}</p> : null}
          {saved && !dirty ? (
            <p className="mr-auto text-sm text-muted-foreground">Changes saved.</p>
          ) : null}
          {!canEdit ? (
            <p className="mr-auto text-sm text-muted-foreground">
              Only admins can change firm settings.
            </p>
          ) : null}
          <Button type="submit" disabled={!canEdit || !dirty || saving || !form.name.trim()}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

import type { Me } from '~/types';

const LANGUAGES: { value: FirmsControllerUpdateBodyPrimaryLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'id', label: 'Bahasa Indonesia' },
];

export function FirmSettingsResourcePage() {
  const { me, can } = useSession();
  const firm = me?.firm;
  const [form, setForm] = useState({
    name: firm?.name ?? '',
    primaryLanguage: (firm?.primaryLanguage ?? 'en') as FirmsControllerUpdateBodyPrimaryLanguage,
    jurisdiction: firm?.jurisdiction ?? '',
    defaultTimezone: firm?.defaultTimezone ?? 'UTC',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!firm) return;
    setForm({
      name: firm.name,
      primaryLanguage: firm.primaryLanguage,
      jurisdiction: firm.jurisdiction,
      defaultTimezone: firm.defaultTimezone,
    });
    setSaved(false);
  }, [firm?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!firm) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Firm" description="General settings for your firm." />
        <EmptyState
          title="No firm configured"
          description="Create the first firm on this instance before changing firm settings."
        />
      </div>
    );
  }

  const canEdit = can('firm.update');
  const dirty =
    form.name !== firm.name ||
    form.primaryLanguage !== firm.primaryLanguage ||
    form.jurisdiction !== firm.jurisdiction ||
    form.defaultTimezone !== firm.defaultTimezone;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      unwrapData(
        await firmsControllerUpdate({
          name: form.name.trim(),
          primaryLanguage: form.primaryLanguage,
          jurisdiction: form.jurisdiction.trim() || undefined,
          defaultTimezone: form.defaultTimezone.trim(),
        }),
      );
      queryClient.setQueryData<Me>(queryKeys.me, (old) =>
        old
          ? {
              ...old,
              firm: old.firm
                ? {
                    ...old.firm,
                    name: form.name.trim(),
                    primaryLanguage: form.primaryLanguage,
                    jurisdiction: form.jurisdiction.trim(),
                    defaultTimezone: form.defaultTimezone.trim(),
                  }
                : old.firm,
            }
          : old,
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save firm settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <PageHeader title="Firm" description="General settings for your firm." />

      <form onSubmit={save} className="flex flex-col gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="firm-name">Firm name</Label>
          <Input
            id="firm-name"
            value={form.name}
            disabled={!canEdit}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Your firm"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firm-language">Primary language</Label>
            <NativeSelect
              id="firm-language"
              className="w-full"
              value={form.primaryLanguage}
              disabled={!canEdit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  primaryLanguage: event.target.value as FirmsControllerUpdateBodyPrimaryLanguage,
                }))
              }
            >
              {LANGUAGES.map((language) => (
                <NativeSelectOption key={language.value} value={language.value}>
                  {language.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="firm-timezone">Default timezone</Label>
            <Input
              id="firm-timezone"
              value={form.defaultTimezone}
              disabled={!canEdit}
              onChange={(event) =>
                setForm((current) => ({ ...current, defaultTimezone: event.target.value }))
              }
              placeholder="UTC"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="firm-jurisdiction">Jurisdiction</Label>
          <Input
            id="firm-jurisdiction"
            value={form.jurisdiction}
            disabled={!canEdit}
            onChange={(event) =>
              setForm((current) => ({ ...current, jurisdiction: event.target.value }))
            }
            placeholder="e.g. US, ID, SG"
          />
          <p className="text-xs text-muted-foreground">
            Used as the default for new matters. Leave blank for multi-jurisdiction firms.
          </p>
        </div>

        <div className="flex min-h-8 flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
          {error ? <p className="mr-auto text-sm text-destructive">{error}</p> : null}
          {saved && !dirty ? (
            <p className="mr-auto text-sm text-muted-foreground">Changes saved.</p>
          ) : null}
          {!canEdit ? (
            <p className="mr-auto text-sm text-muted-foreground">
              Only admins can change firm settings.
            </p>
          ) : null}
          <Button type="submit" disabled={!canEdit || !dirty || saving || !form.name.trim()}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}


const LANGUAGES: { value: FirmsControllerUpdateBodyPrimaryLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'id', label: 'Bahasa Indonesia' },
];

export function FirmSettingsResourcePage() {
  const { me, can } = useSession();
  const firm = me?.firm;
  const [form, setForm] = useState({
    name: firm?.name ?? '',
    primaryLanguage: (firm?.primaryLanguage ?? 'en') as FirmsControllerUpdateBodyPrimaryLanguage,
    jurisdiction: firm?.jurisdiction ?? '',
    defaultTimezone: firm?.defaultTimezone ?? 'UTC',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!firm) return;
    setForm({
      name: firm.name,
      primaryLanguage: firm.primaryLanguage,
      jurisdiction: firm.jurisdiction,
      defaultTimezone: firm.defaultTimezone,
    });
    setSaved(false);
  }, [firm?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!firm) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Firm" description="General settings for your firm." />
        <EmptyState
          title="No firm configured"
          description="Create the first firm on this instance before changing firm settings."
        />
      </div>
    );
  }

  const canEdit = can('firm.update');
  const dirty =
    form.name !== firm.name ||
    form.primaryLanguage !== firm.primaryLanguage ||
    form.jurisdiction !== firm.jurisdiction ||
    form.defaultTimezone !== firm.defaultTimezone;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      unwrapData(
        await firmsControllerUpdate({
          name: form.name.trim(),
          primaryLanguage: form.primaryLanguage,
          jurisdiction: form.jurisdiction.trim() || undefined,
          defaultTimezone: form.defaultTimezone.trim(),
        }),
      );
      queryClient.setQueryData<Me>(queryKeys.me, (old) =>
        old
          ? {
              ...old,
              firm: old.firm
                ? {
                    ...old.firm,
                    name: form.name.trim(),
                    primaryLanguage: form.primaryLanguage,
                    jurisdiction: form.jurisdiction.trim(),
                    defaultTimezone: form.defaultTimezone.trim(),
                  }
                : old.firm,
            }
          : old,
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save firm settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <PageHeader title="Firm" description="General settings for your firm." />

      <form onSubmit={save} className="flex flex-col gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="firm-name">Firm name</Label>
          <Input
            id="firm-name"
            value={form.name}
            disabled={!canEdit}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Your firm"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firm-language">Primary language</Label>
            <NativeSelect
              id="firm-language"
              className="w-full"
              value={form.primaryLanguage}
              disabled={!canEdit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  primaryLanguage: event.target.value as FirmsControllerUpdateBodyPrimaryLanguage,
                }))
              }
            >
              {LANGUAGES.map((language) => (
                <NativeSelectOption key={language.value} value={language.value}>
                  {language.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="firm-timezone">Default timezone</Label>
            <Input
              id="firm-timezone"
              value={form.defaultTimezone}
              disabled={!canEdit}
              onChange={(event) =>
                setForm((current) => ({ ...current, defaultTimezone: event.target.value }))
              }
              placeholder="UTC"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="firm-jurisdiction">Jurisdiction</Label>
          <Input
            id="firm-jurisdiction"
            value={form.jurisdiction}
            disabled={!canEdit}
            onChange={(event) =>
              setForm((current) => ({ ...current, jurisdiction: event.target.value }))
            }
            placeholder="e.g. US, ID, SG"
          />
          <p className="text-xs text-muted-foreground">
            Used as the default for new matters. Leave blank for multi-jurisdiction firms.
          </p>
        </div>

        <div className="flex min-h-8 flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
          {error ? <p className="mr-auto text-sm text-destructive">{error}</p> : null}
          {saved && !dirty ? (
            <p className="mr-auto text-sm text-muted-foreground">Changes saved.</p>
          ) : null}
          {!canEdit ? (
            <p className="mr-auto text-sm text-muted-foreground">
              Only admins can change firm settings.
            </p>
          ) : null}
          <Button type="submit" disabled={!canEdit || !dirty || saving || !form.name.trim()}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

const LANGUAGES: { value: FirmsControllerUpdateBodyPrimaryLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'id', label: 'Bahasa Indonesia' },
];

export function FirmSettingsResourcePage() {
  const { me, can } = useSession();
  const firm = me?.firm;
  const [form, setForm] = useState({
    name: firm?.name ?? '',
    primaryLanguage: (firm?.primaryLanguage ?? 'en') as FirmsControllerUpdateBodyPrimaryLanguage,
    jurisdiction: firm?.jurisdiction ?? '',
    defaultTimezone: firm?.defaultTimezone ?? 'UTC',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!firm) return;
    setForm({
      name: firm.name,
      primaryLanguage: firm.primaryLanguage,
      jurisdiction: firm.jurisdiction,
      defaultTimezone: firm.defaultTimezone,
    });
    setSaved(false);
  }, [firm?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!firm) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Firm" description="General settings for your firm." />
        <EmptyState
          title="No firm configured"
          description="Create the first firm on this instance before changing firm settings."
        />
      </div>
    );
  }

  const canEdit = can('firm.update');
  const dirty =
    form.name !== firm.name ||
    form.primaryLanguage !== firm.primaryLanguage ||
    form.jurisdiction !== firm.jurisdiction ||
    form.defaultTimezone !== firm.defaultTimezone;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      unwrapData(
        await firmsControllerUpdate({
          name: form.name.trim(),
          primaryLanguage: form.primaryLanguage,
          jurisdiction: form.jurisdiction.trim() || undefined,
          defaultTimezone: form.defaultTimezone.trim(),
        }),
      );
      queryClient.setQueryData<Me>(queryKeys.me, (old) =>
        old
          ? {
              ...old,
              firm: old.firm
                ? {
                    ...old.firm,
                    name: form.name.trim(),
                    primaryLanguage: form.primaryLanguage,
                    jurisdiction: form.jurisdiction.trim(),
                    defaultTimezone: form.defaultTimezone.trim(),
                  }
                : old.firm,
            }
          : old,
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save firm settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <PageHeader title="Firm" description="General settings for your firm." />

      <form onSubmit={save} className="flex flex-col gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="firm-name">Firm name</Label>
          <Input
            id="firm-name"
            value={form.name}
            disabled={!canEdit}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Your firm"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firm-language">Primary language</Label>
            <NativeSelect
              id="firm-language"
              className="w-full"
              value={form.primaryLanguage}
              disabled={!canEdit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  primaryLanguage: event.target.value as FirmsControllerUpdateBodyPrimaryLanguage,
                }))
              }
            >
              {LANGUAGES.map((language) => (
                <NativeSelectOption key={language.value} value={language.value}>
                  {language.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="firm-timezone">Default timezone</Label>
            <Input
              id="firm-timezone"
              value={form.defaultTimezone}
              disabled={!canEdit}
              onChange={(event) =>
                setForm((current) => ({ ...current, defaultTimezone: event.target.value }))
              }
              placeholder="UTC"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="firm-jurisdiction">Jurisdiction</Label>
          <Input
            id="firm-jurisdiction"
            value={form.jurisdiction}
            disabled={!canEdit}
            onChange={(event) =>
              setForm((current) => ({ ...current, jurisdiction: event.target.value }))
            }
            placeholder="e.g. US, ID, SG"
          />
          <p className="text-xs text-muted-foreground">
            Used as the default for new matters. Leave blank for multi-jurisdiction firms.
          </p>
        </div>

        <div className="flex min-h-8 flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
          {error ? <p className="mr-auto text-sm text-destructive">{error}</p> : null}
          {saved && !dirty ? (
            <p className="mr-auto text-sm text-muted-foreground">Changes saved.</p>
          ) : null}
          {!canEdit ? (
            <p className="mr-auto text-sm text-muted-foreground">
              Only admins can change firm settings.
            </p>
          ) : null}
          <Button type="submit" disabled={!canEdit || !dirty || saving || !form.name.trim()}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

