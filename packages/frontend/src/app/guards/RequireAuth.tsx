import { Navigate, Outlet } from 'react-router-dom';
import { useMeQuery } from '~/queries/me';

export function RequireAuth() {
  const me = useMeQuery();

  if (me.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Memuat...
      </div>
    );
  }

  if (me.isError || !me.data) {
    return <Navigate to="/login" replace />;
  }

  if (me.data.setupRequired) {
    return <Navigate to="/setup" replace />;
  }

  return <Outlet />;
}