import { Button } from '@depose/ui/components/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from '~/features/auth/api/auth';
import { useMeQuery } from '~/queries/me';

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-2.5 py-1.5 text-sm transition-colors ${
    isActive
      ? 'bg-secondary text-secondary-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

export function AppLayout() {
  const me = useMeQuery();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOutMutation = useMutation({
    mutationFn: () => signOut(),
    onSettled: () => {
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
          <NavLink to="/" className="flex items-baseline gap-2">
            <span className="text-sm font-semibold tracking-tight">Depose</span>
            {me.data?.firm ? (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {me.data.firm.name}
              </span>
            ) : null}
          </NavLink>

          <nav className="ml-4 flex items-center gap-1" aria-label="Primary">
            <NavLink to="/matters" className={navItemClass}>
              Matter
            </NavLink>
            <NavLink to="/onboarding" className={navItemClass}>
              Onboarding
            </NavLink>
            <NavLink to="/settings" className={navItemClass}>
              Pengaturan
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground md:inline">
              {me.data?.user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOutMutation.mutate()}
              disabled={signOutMutation.isPending}
            >
              Keluar
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}