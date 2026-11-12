import { Navigate } from 'react-router-dom';
import { PageLoading } from '~/features/lib/components/PageLoading';
import { readCurrentMatterId } from '~/features/lib/logic/currentMatter';
import { urls } from '~/features/urls';
import { useMatters } from '~/features/matters/matters.queries';

/**
 * Landing redirect, PostHog-style: resume the last-opened matter, else the
 * first active matter, else the matter chooser (/matters). There is no
 * firm-level home — matter IS the project and the app lives inside it.
 */
export function HomePage() {
  const matters = useMatters({ status: 'active' });

  const remembered = readCurrentMatterId();
  if (remembered) {
    return <Navigate to={urls.matterHome(remembered)} replace />;
  }

  const items = matters.data?.pages.flatMap((page) => page.items) ?? [];
  if (items.length > 0) {
    return <Navigate to={urls.matterHome(items[0].id)} replace />;
  }

  if (matters.isPending) {
    return <PageLoading />;
  }

  return <Navigate to={urls.matters()} replace />;
}
