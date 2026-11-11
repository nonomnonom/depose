import { StrictMode } from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClientConfigProvider } from '~/lib/config/client-config';
import { SessionProvider } from '~/lib/auth/session';
import { ThemeProvider } from '~/layout/ThemeProvider';

import { AppLayout } from '~/layout/AppLayout';
import { RequireAuth } from '~/lib/auth/guards';

import { MattersPage } from '~/scenes/matters/MattersPage';
import { LoginPage } from '~/scenes/auth/LoginPage';
import { SignupPage } from '~/scenes/auth/SignupPage';
import { SetupFirmPage } from '~/scenes/onboarding/SetupFirmPage';
import { OnboardingPage } from '~/scenes/onboarding/OnboardingPage';
import { FirmSettingsPage } from '~/scenes/settings/FirmSettingsPage';
import { FirmDomainsList } from '~/scenes/settings/FirmSettingsDomains';
import { ProfileSettingsPage } from '~/scenes/settings/ProfileSettingsPage';
import { NotFoundPage, ForbiddenPage, RouteErrorPage } from '~/layout/ErrorPage';

import '~/styles';

const router = createBrowserRouter([
  {
    path: '/(.*)',
    element: (
      <ClientConfigProvider>
        <SessionProvider>
          <ThemeProvider>
            <AppLayout />
          </ThemeProvider>
        </SessionProvider>
      </ClientConfigProvider>
    ),
    children: [
      {
        index: true,
        element: <RequireAuth />,
        children: [
          {
            index: true,
            element: <MattersPage />,
          },
          {
            path: 'matters',
            element: <MattersPage />,
          },
        ],
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'signup',
        element: <SignupPage />,
      },
      {
        path: 'setup',
        element: <SetupFirmPage />,
      },
      {
        path: 'onboarding',
        element: <OnboardingPage />,
      },
      {
        path: 'settings',
        element: <SettingsLayout />,
        children: [
          {
            index: true,
            element: <FirmSettingsPage />,
          },
          {
            path: 'firm',
            element: <FirmSettingsPage />,
          },
          {
            path: 'firm/domains',
            element: <FirmDomainsList firmId="current" />,
          },
          {
            path: 'profile',
            element: <ProfileSettingsPage />,
          },
        ],
      },
      {
        path: '403',
        element: <ForbiddenPage />,
      },
      {
        path: '404',
        element: <NotFoundPage />,
      },
      {
        path: '*',
        element: <RouteErrorPage />,
      },
    ],
  },
]);

function App() {
  return (
    <StrictMode>
      <QueryClientProvider client={appQueryClient}>
        <RouterProvider router={router} errorElement={<RouteErrorPage />} />
      </QueryClientProvider>
    </StrictMode>
  );
}

export default App;

export { NotFoundPage, ForbiddenPage, RouteErrorPage };
