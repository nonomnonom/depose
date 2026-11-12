import { useState } from 'react';
import { Button } from '@depose/ui/components/button';
import { PageLoading } from '~/features/lib/components/PageLoading';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@depose/ui/components/table';
import { PageHeader } from '~/features/layout/PageHeader';
import { ErrorState } from '~/features/layout/ErrorPage';
import { useSession } from '~/features/lib/auth/session';
import { InviteMemberDialog } from './components/InviteMemberDialog';
import { MemberRow } from './components/MemberRow';
import { PendingInvitations } from './components/PendingInvitations';
import { useFirmMembers } from './members.queries';

export function MembersPage() {
  const { me, can } = useSession();
  const members = useFirmMembers();
  const [inviteOpen, setInviteOpen] = useState(false);
  const canManage = can('firm.member.manage');

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Members"
        description="People with access to this firm. Roles decide what they can do across matters."
        actions={
          canManage ? (
            <Button onClick={() => setInviteOpen(true)}>Invite member</Button>
          ) : undefined
        }
      />

      <section className="flex flex-col gap-3">
        {members.isPending ? (
          <PageLoading />
        ) : members.isError ? (
          <ErrorState
            title="Members could not be loaded"
            message={members.error instanceof Error ? members.error.message : undefined}
            onRetry={() => void members.refetch()}
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="w-40">Role</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-24 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.data.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    canManage={canManage}
                    isSelf={member.email === me?.user.email}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {canManage ? (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-medium">Pending invitations</h2>
            <p className="text-sm text-muted-foreground">
              Invitations that have not been accepted yet.
            </p>
          </div>
          <PendingInvitations />
        </section>
      ) : null}

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
