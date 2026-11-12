import { StrictMode, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
  useParams,
  type RouteObject,
} from 'react-router-dom';

import { RouteErrorPage } from '~/layout/ErrorPage';
import { Navigation } from '~/layout/Navigation';
import { ThemeProvider } from '~/layout/ThemeProvider';
import { useSession, SessionProvider } from '~/lib/auth/session';
import { ClientConfigProvider } from '~/lib/config/client-config';
import { BootScreen } from '~/lib/components/BootScreen';
import { SceneContentFallback } from '~/lib/components/SceneContentFallback';
import { SceneErrorBoundary } from '~/lib/components/SceneErrorBoundary';
import { queryClient } from '~/lib/query/client';

import { getSceneComponent, resolveSceneAccess, SceneProvider, useScene } from './sceneLogic';
import { redirects, routes, type RedirectTarget } from './scenes';
import { Scene } from './sceneTypes';
import { urls } from './urls';

/** Global providers. The router owns no layout, only URL -> scene mapping. */
function AppProviders(): React.ReactNode {
  return (
    <ClientConfigProvider>
      <SessionProvider>
        <ThemeProvider>
          <Outlet />
        </ThemeProvider>
      </SessionProvider>
    </ClientConfigProvider>
  );
}

function RedirectRoute({ to }: { to: RedirectTarget }): React.ReactNode {
  const params = useParams();
  return <Navigate to={typeof to === 'function' ? to(params) : to} replace />;
}

/** Renders a single scene: auth gate -> layout -> lazy component. */
function SceneHost({ scene, sceneKey }: { scene: Scene; sceneKey: string }): React.ReactNode {
  const { me, isLoading } = useSession();
  const location = useLocation();
  const access = resolveSceneAccess(scene, me, isLoading, location.pathname + location.search);

  if (access.kind === 'loading') return <BootScreen />;
  if (access.kind === 'redirect') return <Navigate to={access.to} replace />;

  return (
    <SceneProvider sceneId={scene} sceneKey={sceneKey}>
      <Navigation>
        <SceneContent sceneId={scene} />
      </Navigation>
    </SceneProvider>
  );
}

function SceneContent({ sceneId }: { sceneId: Scene }): React.ReactNode {
  const { sceneParams } = useScene();
  const SceneComponent = getSceneComponent(sceneId);
  return (
    <SceneErrorBoundary sceneId={sceneId}>
      <Suspense fallback={<SceneContentFallback />}>
        <SceneComponent {...sceneParams.params} />
      </Suspense>
    </SceneErrorBoundary>
  );
}

const routeObjects: RouteObject[] = [
  { index: true, element: <Navigate to={urls.default()} replace /> },
  ...Object.entries(redirects).map(([path, to]) => ({
    path: path.replace(/^\//, ''),
    element: <RedirectRoute to={to} />,
  })),
  ...Object.entries(routes).map(([path, [scene, sceneKey]]) => ({
    path: path.replace(/^\//, ''),
    element: <SceneHost scene={scene} sceneKey={sceneKey} />,
  })),
  { path: '*', element: <SceneHost scene={Scene.Error404} sceneKey="error404" /> },
];

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppProviders />,
    errorElement: <RouteErrorPage />,
    children: routeObjects,
  },
]);

export function App(): React.ReactNode {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  );
}
