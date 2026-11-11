import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { BootScreen } from '~/lib/components/BootScreen';
import { useSession } from '~/lib/auth/session';

function loginPath(from: string): string {
  return from && from !== '/' ? `/login?returnTo=${encodeURIComponent(from)}` : '/login';
}

export function RequireAuth() {
  const { me, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) return <BootScreen />;
  if (!me) return <Navigate to={loginPath(location.pathname + location.search)} replace />;
  if (me.setupRequired) return <Navigate to="/setup" replace />;

  return <Outlet />;
}

export function RequireGuest() {
  const { me, isLoading } = useSession();

  if (isLoading) return <BootScreen />;
  if (me) return <Navigate to={me.setupRequired ? '/setup' : '/matters'} replace />;

  return <Outlet />;
}

export function RequireSetup() {
  const { me, isLoading } = useSession();

  if (isLoading) return <BootScreen />;
  if (!me) return <Navigate to="/login" replace />;
  if (!me.setupRequired) return <Navigate to="/matters" replace />;

  return <Outlet />;
}

export function RequirePermission({ action }: { action: string }) {
  const { isLoading, permissionsLoading, can } = useSession();

  if (isLoading || permissionsLoading) return <BootScreen />;
  if (!can(action)) return <Navigate to="/403" replace />;

  return <Outlet />;
}
