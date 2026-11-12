import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@depose/ui/components/avatar';
import { Button } from '@depose/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@depose/ui/components/dropdown-menu';
import { LogOut, User } from '@coolicons/react';
import { urls } from '~/features/urls';
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
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-foreground">{me.user.name}</span>
          <span className="truncate text-xs font-normal">{me.user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(urls.settingsProfile())}>
          <User size={16} />
          Profile and account
        </DropdownMenuItem>
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
