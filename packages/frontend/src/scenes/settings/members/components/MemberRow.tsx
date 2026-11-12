import { useState } from 'react';
import { Avatar, AvatarFallback } from '@depose/ui/components/avatar';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@depose/ui/components/alert-dialog';
import { Button } from '@depose/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@depose/ui/components/select';
import { TableCell, TableRow } from '@depose/ui/components/table';
import type { MemberDto } from '~/generated/schemas';
import { initials } from '~/lib/format/date';
import { useRemoveMember, useUpdateMemberRole } from '../members.queries';
import { ROLE_LABELS, ROLE_OPTIONS } from '../roles';

interface MemberRowProps {
  member: MemberDto;
  canManage: boolean;
  isSelf: boolean;
}

export function MemberRow({ member, canManage, isSelf }: MemberRowProps) {
  const updateRole = useUpdateMemberRole();
  const remove = useRemoveMember();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mayEdit = canManage && !isSelf;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            <AvatarFallback>{initials(member.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {member.name}
              {isSelf ? <span className="ml-1.5 text-xs text-muted-foreground">(you)</span> : null}
            </p>
            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {mayEdit ? (
          <Select
            value={member.role}
            onValueChange={(role) => {
              if (!role) return;
              setError(null);
              updateRole.mutate(
                { id: member.id, input: { role } },
                { onError: (err) => setError(err instanceof Error ? err.message : 'Failed') },
              );
            }}
          >
            <SelectTrigger size="sm" aria-label={`Role for ${member.name}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-muted-foreground">{ROLE_LABELS[member.role]}</span>
        )}
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </TableCell>
      <TableCell className="text-sm capitalize text-muted-foreground">{member.status}</TableCell>
      <TableCell className="text-right">
        {mayEdit ? (
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              Remove
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  They lose access to every matter in this firm immediately. Their account stays
                  intact.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {remove.error ? (
                <p className="text-sm text-destructive">
                  {remove.error instanceof Error ? remove.error.message : 'Could not remove member.'}
                </p>
              ) : null}
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate(member.id, { onSuccess: () => setConfirmOpen(false) })
                  }
                >
                  {remove.isPending ? 'Removing...' : 'Remove member'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
