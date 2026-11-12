import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@depose/ui/components/alert';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { Skeleton } from '@depose/ui/components/skeleton';
import { CircleWarning, Check } from '@coolicons/react';
import { AuthFrame } from '~/layout/layout-modes/AuthFrame';
import { useSession } from '~/lib/auth/session';
import { signOut } from '~/lib/auth/api';
import { queryKeys } from '~/lib/query/keys';
import { formatRelativeDate } from '~/lib/format/date';
import { useAcceptInvitation, useInvitation } from './invitations.queries';

export function InvitationPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { me, isLoading } = useSession();
  const invitation = useInvitation(token);
  const accept = useAcceptInvitation(token);

  const returnTo = `/invitations/${token}`;
  const data = invitation.data;
  const emailMatches =
    Boolean(me && data) && me!.user.email.toLowerCase() === data!.email.toLowerCase();

  const acceptInvitation = () =>
    accept.mutate(undefined, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.me });
        void queryClient.invalidateQueries({ queryKey: queryKeys.permissions });
        navigate('/matters', { replace: true });
      },
    });

  const switchAccount = async () => {
    await signOut();
    queryClient.clear();
    window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  if (invitation.isPending || isLoading) {
    return (
      <AuthFrame title="Invitation" description="Checking your invitation.">
        <div className="space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-9 w-40" />
        </div>
      </AuthFrame>
    );
  }

  if (invitation.isError) {
    return (
      <AuthFrame
        title="Invitation not found"
        description="This link is invalid or has already been used."
        switcher={
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Go to login
          </Link>
        }
      >
        <Alert variant="destructive">
          <CircleWarning size={16} />
          <AlertTitle>Check the link</AlertTitle>
          <AlertDescription>
            Ask your firm admin to send a new invitation. Links are single-use and expire after
            seven days.
          </AlertDescription>
        </Alert>
      </AuthFrame>
    );
  }

  if (!data) {
    return (
      <AuthFrame title="Invitation" description="This invitation could not be loaded.">
        <Alert variant="destructive">
          <CircleWarning size={16} />
          <AlertTitle>Try again</AlertTitle>
          <AlertDescription>Reload this page or ask your firm admin for a new link.</AlertDescription>
        </Alert>
      </AuthFrame>
    );
  }

  if (data.status === 'accepted') {
    return (
      <AuthFrame
        title="Invitation already accepted"
        description={`You already have access to ${data.firmName}.`}
        switcher={
          <Link to="/matters" className="font-medium text-primary underline-offset-4 hover:underline">
            Go to matters
          </Link>
        }
      >
        <Alert>
          <Check size={16} />
          <AlertTitle>Nothing left to do</AlertTitle>
          <AlertDescription>Sign in with {data.email} to open the firm.</AlertDescription>
        </Alert>
      </AuthFrame>
    );
  }

  if (data.status === 'expired' || data.status === 'revoked') {
    return (
      <AuthFrame
        title="Invitation no longer valid"
        description={`This invitation to ${data.firmName} is ${data.status}.`}
        switcher={
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Go to login
          </Link>
        }
      >
        <Alert>
          <CircleWarning size={16} />
          <AlertTitle>Ask for a new link</AlertTitle>
          <AlertDescription>
            Invitations expire after seven days. Your firm admin can resend it from Members.
          </AlertDescription>
        </Alert>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title={`Join ${data.firmName}`}
      description={`${data.inviterName} invited you to collaborate on Depose.`}
      switcher={
        <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Use a different account
        </Link>
      }
      footer={
        accept.error ? (
          <Alert variant="destructive">
            <CircleWarning size={16} />
            <AlertTitle>Could not accept</AlertTitle>
            <AlertDescription>
              {accept.error instanceof Error ? accept.error.message : 'Please try again.'}
            </AlertDescription>
          </Alert>
        ) : null
      }
    >
      <div className="flex flex-col gap-5">
        <dl className="divide-y divide-border rounded-lg border border-border text-sm">
          <div className="flex items-center justify-between gap-4 px-3 py-2.5">
            <dt className="text-muted-foreground">Firm</dt>
            <dd className="font-medium">{data.firmName}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-3 py-2.5">
            <dt className="text-muted-foreground">Role</dt>
            <dd>
              <Badge variant="secondary" className="capitalize">
                {data.role}
              </Badge>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-3 py-2.5">
            <dt className="text-muted-foreground">Invited email</dt>
            <dd className="truncate font-medium">{data.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-3 py-2.5">
            <dt className="text-muted-foreground">Expires</dt>
            <dd className="text-muted-foreground">{formatRelativeDate(data.expiresAt)}</dd>
          </div>
        </dl>

        {me ? (
          emailMatches ? (
            <Button className="w-full" onClick={acceptInvitation} disabled={accept.isPending}>
              {accept.isPending ? 'Accepting...' : `Accept and join ${data.firmName}`}
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <Alert>
                <CircleWarning size={16} />
                <AlertTitle>Wrong account</AlertTitle>
                <AlertDescription>
                  You are signed in as {me.user.email}. This invitation is for {data.email}.
                </AlertDescription>
              </Alert>
              <Button variant="outline" className="w-full" onClick={() => void switchAccount()}>
                Sign out and use {data.email}
              </Button>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              render={
                <Link
                  to={`/signup?returnTo=${encodeURIComponent(returnTo)}&email=${encodeURIComponent(data.email)}`}
                />
              }
            >
              Create account and accept
            </Button>
            <Button
              variant="outline"
              className="w-full"
              render={<Link to={`/login?returnTo=${encodeURIComponent(returnTo)}`} />}
            >
              I already have an account
            </Button>
          </div>
        )}
      </div>
    </AuthFrame>
  );
}
