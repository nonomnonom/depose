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

import { AppLayout } from '~/layout/app-shell/AppLayout';
import { MatterLayout } from '~/layout/matter/MatterLayout';
import { SettingsLayout } from '~/layout/settings/SettingsLayout';
import { RequireAuth, RequireGuest, RequireSetup } from '~/lib/auth/guards';

import { MattersPage } from '~/scenes/matters/MattersPage';
import { LoginPage } from '~/scenes/auth/LoginPage';
import { SignupPage } from '~/scenes/auth/SignupPage';
import { SetupFirmPage } from '~/scenes/onboarding/SetupFirmPage';
import { FirmSettingsPage } from '~/scenes/settings/firm/FirmSettingsPage';
import { FirmDomainsList } from '~/scenes/settings/firm/FirmSettingsDomains';
import { MembersPage } from '~/scenes/settings/members/MembersPage';
import { McpSettingsPage } from '~/scenes/settings/mcp/McpSettingsPage';
import { ProfileSettingsPage } from '~/scenes/settings/user/ProfileSettingsPage';
import { PlaceholderPage } from '~/lib/components/PlaceholderPage';
import { NotificationsPage } from '~/scenes/notifications/NotificationsPage';
import { DocumentsPage } from '~/scenes/documents/DocumentsPage';
import { DocumentViewerPage } from '~/scenes/documents/DocumentViewerPage';
import { FactsPage } from '~/scenes/facts/FactsPage';
import { AiPage } from '~/scenes/ai/AiPage';
import { OverviewPage } from '~/scenes/matter/OverviewPage';
import { SummaryPage } from '~/scenes/matter/SummaryPage';
import { ContradictionsPage } from '~/scenes/matter/ContradictionsPage';
import { EntitiesPage } from '~/scenes/matter/EntitiesPage';
import { OutputsPage } from '~/scenes/matter/OutputsPage';
import { OutputDetailPage } from '~/scenes/matter/OutputDetailPage';
import { LivePage } from '~/scenes/matter/LivePage';
import { ChronologyPage } from '~/scenes/matter/ChronologyPage';
import { MatterSettingsPage } from '~/scenes/settings/MatterSettingsPage';
import { SearchPage } from '~/scenes/search/SearchPage';
import { SubsetsPage } from '~/scenes/subsets/SubsetsPage';
import { SubsetWorkspacePage } from '~/scenes/subsets/SubsetWorkspacePage';
import { AiProvidersPage } from '~/scenes/settings/ai/AiProvidersPage';
import { AppearanceSettingsPage } from '~/scenes/settings/user/AppearanceSettingsPage';
import { NotificationSettingsPage } from '~/scenes/settings/user/NotificationSettingsPage';
import { HelpPage } from '~/scenes/help/HelpPage';
import { InvitationPage } from '~/scenes/invitations/InvitationPage';
import {
  NotFoundPage,
  ForbiddenPage,
  TenantNotFoundPage,
  MaintenancePage,
  RouteErrorPage,
} from '~/layout/ErrorPage';

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
      { path: 'invitations/:token', element: <InvitationPage /> },
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
                path: 'matters/:matterId',
                element: <MatterLayout />,
                children: [
                  { index: true, element: <Navigate to="overview" replace /> },
                  { path: 'overview', element: <OverviewPage /> },
                  { path: 'documents', element: <DocumentsPage /> },
                  { path: 'documents/:documentId', element: <DocumentViewerPage /> },
                  { path: 'facts', element: <FactsPage /> },
                  { path: 'subsets', element: <SubsetsPage /> },
                  { path: 'subsets/:subsetId', element: <SubsetWorkspacePage /> },
                  { path: 'summary', element: <SummaryPage /> },
                  { path: 'chronology', element: <ChronologyPage /> },
                  { path: 'intelligence', element: <ContradictionsPage /> },
                  { path: 'entities', element: <EntitiesPage /> },
                  { path: 'outputs', element: <OutputsPage /> },
                  { path: 'outputs/:outputId', element: <OutputDetailPage /> },
                  { path: 'search', element: <SearchPage /> },
                  { path: 'realtime', element: <LivePage /> },
                  { path: 'ai', element: <AiPage /> },
                  { path: 'settings', element: <MatterSettingsPage /> },
                ],
              },
              { path: 'search', element: <PlaceholderPage title="Search" description="Search across the matter record." emptyTitle="Search is not ready" emptyDescription="Search results appear after documents and facts are indexed." /> },
              { path: 'outputs', element: <PlaceholderPage title="Outputs" description="Work product across matters." emptyTitle="No outputs yet" emptyDescription="Outputs are created inside a matter." /> },
              { path: 'notifications', element: <NotificationsPage /> },
              {
                path: 'settings',
                element: <SettingsLayout />,
                children: [
                  { index: true, element: <Navigate to="/settings/firm" replace /> },
                  { path: 'firm', element: <FirmSettingsPage /> },
                  { path: 'firm/members', element: <MembersPage /> },
                  { path: 'firm/domains', element: <FirmDomainsList firmId="current" /> },
                  { path: 'firm/ai', element: <AiProvidersPage /> },
                  { path: 'firm/integrations/mcp', element: <McpSettingsPage /> },
                  { path: 'user', element: <Navigate to="/settings/user/profile" replace /> },
                  { path: 'user/profile', element: <ProfileSettingsPage /> },
                  {
                    path: 'user/security',
                    element: <PlaceholderPage title="Security" description="Password, sessions, and SSO." emptyTitle="Security settings not available" emptyDescription="Session and password controls ship with the identity module." />,
                  },
                  { path: 'user/notifications', element: <NotificationSettingsPage /> },
                  { path: 'user/appearance', element: <AppearanceSettingsPage /> },
                  {
                    path: 'user/ai',
                    element: <PlaceholderPage title="My AI" description="Your default model and effort." emptyTitle="No model configured" emptyDescription="Personal model defaults ship with the model gateway." />,
                  },
                  { path: 'profile', element: <Navigate to="/settings/user/profile" replace /> },
                ],
              },
              { path: 'help', element: <HelpPage /> },
              { path: 'help/:slug', element: <HelpPage /> },
              {
                path: 'admin',
                element: <PlaceholderPage title="Admin" description="Usage, storage, and queue health." emptyTitle="Admin dashboard not available" emptyDescription="Admin metrics ship with the usage module." />,
              },
            ],
          },
        ],
      },
      { path: '403', element: <ForbiddenPage /> },
      { path: '404', element: <NotFoundPage /> },
      { path: 'tenant-not-found', element: <TenantNotFoundPage /> },
      { path: 'maintenance', element: <MaintenancePage /> },
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
