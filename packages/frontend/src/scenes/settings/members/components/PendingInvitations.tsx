import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { Skeleton } from '@depose/ui/components/skeleton';
import type { InvitationDto } from '~/generated/schemas';
import { formatRelativeDate } from '~/lib/format/date';
import { useFirmInvitations, useResendInvitation, useRevokeInvitation } from '../members.queries';
import { ROLE_LABELS } from '../roles';

export function PendingInvitations() {
  const query = useFirmInvitations();
  const resend = useResendInvitation();
  const revoke = useRevokeInvitation();

  const pending = (query.data ?? []).filter(
    (invitation) => invitation.status === 'pending' || invitation.status === 'expired',
  );

  if (query.isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Invitations could not be loaded.{' '}
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={() => void query.refetch()}
        >
          Retry
        </button>
      </p>
    );
  }

  if (pending.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No pending invitations. Invite a colleague to give them access.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {pending.map((invitation) => (
        <InvitationRow
          key={invitation.id}
          invitation={invitation}
          onResend={() => resend.mutate(invitation.id)}
          onRevoke={() => revoke.mutate(invitation.id)}
          busy={resend.isPending || revoke.isPending}
        />
      ))}
    </div>
  );
}

function InvitationRow({
  invitation,
  onResend,
  onRevoke,
  busy,
}: {
  invitation: InvitationDto;
  onResend: () => void;
  onRevoke: () => void;
  busy: boolean;
}) {
  const expired = invitation.status === 'expired';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{invitation.email}</p>
        <p className="text-xs text-muted-foreground">
          {ROLE_LABELS[invitation.role as keyof typeof ROLE_LABELS]} ·{' '}
          {expired ? 'Expired' : 'Expires'} {formatRelativeDate(invitation.expiresAt)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={expired ? 'outline' : 'secondary'} className="text-xs">
          {expired ? 'Expired' : 'Pending'}
        </Badge>
        <Button variant="ghost" size="sm" disabled={busy} onClick={onResend}>
          Resend
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          className="text-muted-foreground hover:text-destructive"
          onClick={onRevoke}
        >
          Revoke
        </Button>
      </div>
    </div>
  );
}
