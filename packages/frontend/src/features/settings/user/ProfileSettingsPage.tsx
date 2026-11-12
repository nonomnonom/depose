import { useState } from 'react';
import { Button } from '@depose/ui/components/button';
import { Input } from '@depose/ui/components/input';
import { Label } from '@depose/ui/components/label';
import { PageHeader } from '~/features/layout/PageHeader';
import { useSession } from '~/features/lib/auth/session';
import { updateProfile } from '~/features/lib/auth/api';
import { ApiError } from '~/features/lib/api/errors';
import { queryClient } from '~/features/lib/query/client';
import { queryKeys } from '~/features/lib/query/keys';
import type { Me } from '~/types';

export function ProfileSettingsPage() {
  const { me } = useSession();
  const [name, setName] = useState(me?.user.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!me) return null;

  const dirty = name.trim() !== me.user.name;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile({ name: name.trim() });
      queryClient.setQueryData<Me>(queryKeys.me, (old) =>
        old ? { ...old, user: { ...old.user, name: name.trim() } } : old,
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <PageHeader
        title="Profile"
        description="Your name is shown on reviews, comments, and audit entries."
      />

      <form onSubmit={save} className="flex flex-col gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="profile-name">Full name</Label>
          <Input
            id="profile-name"
            value={name}
            autoComplete="name"
            onChange={(event) => {
              setName(event.target.value);
              setSaved(false);
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" value={me.user.email} readOnly disabled />
          <p className="text-xs text-muted-foreground">
            Email changes are managed by your firm admin to keep invitations and audit entries
            consistent.
          </p>
        </div>

        <div className="flex min-h-8 flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
          {error ? <p className="mr-auto text-sm text-destructive">{error}</p> : null}
          {saved && !dirty ? (
            <p className="mr-auto text-sm text-muted-foreground">Profile updated.</p>
          ) : null}
          <Button type="submit" disabled={!dirty || saving || !name.trim()}>
            {saving ? 'Saving...' : 'Save profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}
