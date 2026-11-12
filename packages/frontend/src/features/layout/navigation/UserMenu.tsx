import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@depose/ui/components/avatar';
import { Button } from '@depose/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@depose/ui/components/dropdown-menu';
import { LogOut, User } from '@coolicons/react';
import { settingsHref } from '~/features/settings/settingsSections';
import { useSession, useSignOut } from '~/features/lib/auth/session';
import { initials } from '~/features/lib/format/date';

export function UserMenu() {
  const { me } = useSession();
  const navigate = useNavigate();
  const signOut = useSignOut();

  if (!me) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label={`Menu akun ${me.user.name}`}
          />
        }
      >
        <Avatar size="sm">
          <AvatarFallback>{initials(me.user.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">{me.user.name}</span>
            <span className="truncate text-xs font-normal">{me.user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigate(settingsHref('user-profile'))}>
            <User size={16} />
            Profile and account
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={signOut.isPending}
          onClick={() => signOut.mutate()}
        >
          <LogOut size={16} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
