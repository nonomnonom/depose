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
import { FactsPage } from '~/scenes/facts/FactsPage';
import { AiPage } from '~/scenes/ai/AiPage';
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

const matterPlaceholder = (title: string, emptyTitle: string, emptyDescription: string) => (
  <PlaceholderPage
    title={title}
    description={`${title} for this matter.`}
    emptyTitle={emptyTitle}
    emptyDescription={emptyDescription}
  />
);

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
                  {
                    path: 'overview',
                    element: matterPlaceholder(
                      'Overview',
                      'No activity yet',
                      'Upload evidence to start building the matter overview.',
                    ),
                  },
                  { path: 'documents', element: <DocumentsPage /> },
                  {
                    path: 'documents/:documentId',
                    element: matterPlaceholder(
                      'Document',
                      'Document viewer not available',
                      'The document viewer ships with the evidence pipeline.',
                    ),
                  },
                  { path: 'facts', element: <FactsPage /> },
                  {
                    path: 'subsets',
                    element: matterPlaceholder(
                      'Subsets',
                      'No subsets yet',
                      'Subsets let the team work on a scoped slice of the matter record.',
                    ),
                  },
                  { path: 'subsets/new', element: <Navigate to="../" replace /> },
                  {
                    path: 'subsets/:subsetId/*',
                    element: matterPlaceholder(
                      'Subset',
                      'Subset workspace not available',
                      'The subset workspace ships with retrieval and issue scoping.',
                    ),
                  },
                  {
                    path: 'summary',
                    element: matterPlaceholder(
                      'Summary',
                      'No summary yet',
                      'Themes and key facts are generated from confirmed facts.',
                    ),
                  },
                  {
                    path: 'chronology',
                    element: matterPlaceholder(
                      'Chronology',
                      'No events yet',
                      'Events are generated from dated facts.',
                    ),
                  },
                  {
                    path: 'intelligence',
                    element: matterPlaceholder(
                      'Contradictions',
                      'No contradictions or gaps',
                      'Detection runs after facts are confirmed.',
                    ),
                  },
                  {
                    path: 'entities',
                    element: matterPlaceholder(
                      'Entities',
                      'No entities yet',
                      'People and organisations are resolved from extracted facts.',
                    ),
                  },
                  {
                    path: 'outputs',
                    element: matterPlaceholder(
                      'Outputs',
                      'No outputs yet',
                      'Chronologies, matrices, memos, and bundles will be created here.',
                    ),
                  },
                  {
                    path: 'outputs/:outputId',
                    element: matterPlaceholder(
                      'Output',
                      'Output editor not available',
                      'The output editor ships with the outputs module.',
                    ),
                  },
                  { path: 'search', element: <Navigate to="/search" replace /> },
                  {
                    path: 'realtime',
                    element: matterPlaceholder(
                      'Live',
                      'No live session',
                      'Live text fact-checking ships after the fact bank.',
                    ),
                  },
                  { path: 'ai', element: <AiPage /> },
                  {
                    path: 'settings',
                    element: matterPlaceholder(
                      'Matter settings',
                      'Settings module not available',
                      'Matter settings ship with the settings domain.',
                    ),
                  },
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
                  {
                    path: 'firm/ai',
                    element: <PlaceholderPage title="Firm AI" description="Firm default models and providers." emptyTitle="No provider connected" emptyDescription="The model gateway is not configured yet." />,
                  },
                  { path: 'firm/integrations/mcp', element: <McpSettingsPage /> },
                  { path: 'user', element: <Navigate to="/settings/user/profile" replace /> },
                  { path: 'user/profile', element: <ProfileSettingsPage /> },
                  {
                    path: 'user/security',
                    element: <PlaceholderPage title="Security" description="Password, sessions, and SSO." emptyTitle="Security settings not available" emptyDescription="Session and password controls ship with the identity module." />,
                  },
                  {
                    path: 'user/notifications',
                    element: <PlaceholderPage title="Notifications" description="Choose what reaches you and when." emptyTitle="Preferences not available" emptyDescription="Notification preferences ship with the notifications module." />,
                  },
                  {
                    path: 'user/appearance',
                    element: <PlaceholderPage title="Appearance" description="Theme and density." emptyTitle="Appearance options not available" emptyDescription="Theme and density controls ship with the design system settings." />,
                  },
                  {
                    path: 'user/ai',
                    element: <PlaceholderPage title="My AI" description="Your default model and effort." emptyTitle="No model configured" emptyDescription="Personal model defaults ship with the model gateway." />,
                  },
                  { path: 'profile', element: <Navigate to="/settings/user/profile" replace /> },
                ],
              },
              {
                path: 'help',
                element: <PlaceholderPage title="Help" description="Guides and diagnostics." emptyTitle="No articles yet" emptyDescription="Help articles ship with the onboarding polish." />,
              },
              {
                path: 'help/:slug',
                element: <PlaceholderPage title="Help article" description="Guide." emptyTitle="Article not available" emptyDescription="This article has not been written yet." />,
              },
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
