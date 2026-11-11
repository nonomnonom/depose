import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '~/lib/query/client';
import { ClientConfigProvider } from '~/lib/config/client-config';
import { SessionProvider } from '~/lib/auth/session';
import { ThemeProvider } from '~/layout/ThemeProvider';

import { AppLayout } from '~/layout/AppLayout';
import { RequireAuth, RequireGuest, RequireSetup } from '~/lib/auth/guards';

import { MattersPage } from '~/scenes/matters/MattersPage';
import { LoginPage } from '~/scenes/auth/LoginPage';
import { SignupPage } from '~/scenes/auth/SignupPage';
import { SetupFirmPage } from '~/scenes/onboarding/SetupFirmPage';
import { FirmSettingsPage } from '~/scenes/settings/FirmSettingsPage';
import { FirmDomainsList } from '~/scenes/settings/FirmSettingsDomains';
import { ProfileSettingsPage } from '~/scenes/settings/ProfileSettingsPage';
import { SettingsLayout } from '~/layout/SettingsLayout';
import { NotFoundPage, ForbiddenPage, RouteErrorPage } from '~/layout/ErrorPage';

import '~/styles';

function RootProviders() {
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

function SetupShell() {
  return (
    <div className="min-h-dvh bg-background px-4 py-10">
      <SetupFirmPage />
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootProviders />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <RequireGuest />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'signup', element: <SignupPage /> },
        ],
      },
      {
        element: <RequireSetup />,
        children: [{ path: 'setup', element: <SetupShell /> }],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <Navigate to="/matters" replace /> },
              { path: 'matters', element: <MattersPage /> },
              {
                path: 'settings',
                element: <SettingsLayout />,
                children: [
                  { index: true, element: <Navigate to="/settings/firm" replace /> },
                  { path: 'firm', element: <FirmSettingsPage /> },
                  { path: 'firm/domains', element: <FirmDomainsList firmId="current" /> },
                  { path: 'profile', element: <ProfileSettingsPage /> },
                ],
              },
            ],
          },
        ],
      },
      { path: '403', element: <ForbiddenPage /> },
      { path: '404', element: <NotFoundPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

function App() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  );
}

export default App;

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}

export { NotFoundPage, ForbiddenPage, RouteErrorPage };
