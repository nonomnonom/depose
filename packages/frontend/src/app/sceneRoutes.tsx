import type { RouteObject } from 'react-router-dom';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';

import { ClientConfigProvider } from '~/lib/config/client-config';
import { SessionProvider } from '~/lib/auth/session';
import { ThemeProvider } from '~/layout/ThemeProvider';
import { AppLayout } from '~/layout/app-shell/AppLayout';
import { MatterLayout } from '~/layout/matter/MatterLayout';
import { SettingsLayout } from '~/layout/settings/SettingsLayout';
import { RequireAuth, RequireGuest, RequireSetup } from '~/lib/auth/guards';
import { NotFoundPage, ForbiddenPage, TenantNotFoundPage, MaintenancePage, RouteErrorPage } from '~/layout/ErrorPage';
import { HelpPage } from '~/scenes/help/HelpPage';
import { NotificationsPage } from '~/scenes/notifications/NotificationsPage';
import { PlaceholderPage } from '~/lib/components/PlaceholderPage';
import { InvitationPage } from '~/scenes/invitations/InvitationPage';
import { LoginPage } from '~/scenes/auth/LoginPage';
import { SignupPage } from '~/scenes/auth/SignupPage';
import { SetupFirmPage } from '~/scenes/onboarding/SetupFirmPage';
import { AiProvidersPage } from '~/scenes/settings/ai/AiProvidersPage';
import { AppearanceSettingsPage } from '~/scenes/settings/user/AppearanceSettingsPage';
import { NotificationSettingsPage } from '~/scenes/settings/user/NotificationSettingsPage';
import { ProfileSettingsPage } from '~/scenes/settings/user/ProfileSettingsPage';
import { FirmSettingsPage } from '~/scenes/settings/firm/FirmSettingsPage';
import { FirmDomainsList } from '~/scenes/settings/firm/FirmSettingsDomains';
import { McpSettingsPage } from '~/scenes/settings/mcp/McpSettingsPage';
import { MembersPage } from '~/scenes/settings/members/MembersPage';
import { MatterSettingsPage } from '~/scenes/settings/MatterSettingsPage';
import { SubsetsPage } from '~/scenes/subsets/SubsetsPage';
import { SubsetWorkspacePage } from '~/scenes/subsets/SubsetWorkspacePage';
import { OutputsPage } from '~/scenes/matter/OutputsPage';
import { OutputDetailPage } from '~/scenes/matter/OutputDetailPage';
import { LivePage } from '~/scenes/matter/LivePage';
import { AiPage } from '~/scenes/ai/AiPage';
import { ChronologyPage } from '~/scenes/matter/ChronologyPage';
import { ContradictionsPage } from '~/scenes/matter/ContradictionsPage';
import { EntitiesPage } from '~/scenes/matter/EntitiesPage';
import { SummaryPage } from '~/scenes/matter/SummaryPage';
import { DocumentsPage } from '~/scenes/documents/DocumentsPage';
import { DocumentViewerPage } from '~/scenes/documents/DocumentViewerPage';
import { FactsPage } from '~/scenes/facts/FactsPage';
import { MattersPage } from '~/scenes/matters/MattersPage';
import { SearchPage } from '~/scenes/search/SearchPage';

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

export const sceneRoutes: RouteObject[] = [
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
                  { index: true, element: <Navigate to="summary" replace /> },
                  { path: 'summary', element: <SummaryPage /> },
                  { path: 'data/facts', element: <FactsPage /> },
                  { path: 'data/chronologies', element: <ChronologyPage /> },
                  { path: 'data/inconsistencies', element: <ContradictionsPage /> },
                  { path: 'data/reports', element: <OutputsPage /> },
                  { path: 'data/reports/:outputId', element: <OutputDetailPage /> },
                  { path: 'data/entities', element: <EntitiesPage /> },
                  { path: 'data/documents', element: <DocumentsPage /> },
                  { path: 'data/documents/:documentId', element: <DocumentViewerPage /> },
                  { path: 'data/subsets', element: <SubsetsPage /> },
                  { path: 'data/subsets/:subsetId', element: <SubsetWorkspacePage /> },
                  { path: 'data/search', element: <SearchPage /> },
                  { path: 'kim', element: <AiPage /> },
                  { path: 'realtime', element: <LivePage /> },
                  { path: 'settings', element: <MatterSettingsPage /> },
                  { path: 'overview', element: <Navigate to="summary" replace /> },
                  { path: 'intelligence', element: <Navigate to="data/inconsistencies" replace /> },
                  { path: 'facts', element: <Navigate to="data/facts" replace /> },
                  { path: 'chronology', element: <Navigate to="data/chronologies" replace /> },
                  { path: 'entities', element: <Navigate to="data/entities" replace /> },
                  { path: 'outputs', element: <Navigate to="data/reports" replace /> },
                  { path: 'documents', element: <Navigate to="data/documents" replace /> },
                  { path: 'subsets', element: <Navigate to="data/subsets" replace /> },
                  { path: 'ai', element: <Navigate to="kim" replace /> },
                  { path: 'realtime', element: <Navigate to="realtime" replace /> },
                  { path: 'search', element: <Navigate to="data/search" replace /> },
                ],
              },
              { path: 'settings', element: <SettingsLayout />, children: [
                { index: true, element: <Navigate to="/settings/firm" replace /> },
                { path: 'firm', element: <FirmSettingsPage /> },
                { path: 'firm/members', element: <MembersPage /> },
                { path: 'firm/domains', element: <FirmDomainsList firmId="current" /> },
                { path: 'firm/ai', element: <AiProvidersPage /> },
                { path: 'firm/integrations/mcp', element: <McpSettingsPage /> },
                { path: 'user', element: <Navigate to="/settings/user/profile" replace /> },
                { path: 'user/profile', element: <ProfileSettingsPage /> },
                { path: 'user/security', element: <PlaceholderPage title="Security" description="Password, sessions, and SSO." emptyTitle="Security settings not available" emptyDescription="Session and password controls ship with the identity module." /> },
                { path: 'user/notifications', element: <NotificationSettingsPage /> },
                { path: 'user/appearance', element: <AppearanceSettingsPage /> },
                { path: 'user/ai', element: <PlaceholderPage title="My AI" description="Your default model and effort." emptyTitle="No model configured" emptyDescription="Personal model defaults ship with the model gateway." /> },
                { path: 'profile', element: <Navigate to="/settings/user/profile" replace /> },
              ] },
              { path: 'notifications', element: <NotificationsPage /> },
              { path: 'help', element: <HelpPage /> },
              { path: 'help/:slug', element: <HelpPage /> },
              { path: 'admin', element: <PlaceholderPage title="Admin" description="Usage, storage, and queue health." emptyTitle="Admin dashboard not available" emptyDescription="Admin metrics ship with the usage module." /> },
            ],
          },
          { path: '403', element: <ForbiddenPage /> },
          { path: '404', element: <NotFoundPage /> },
          { path: 'tenant-not-found', element: <TenantNotFoundPage /> },
          { path: 'maintenance', element: <MaintenancePage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export const sceneRouter = createBrowserRouter(sceneRoutes);

export function SceneApp() {
  return <RouterProvider router={sceneRouter} />;
}



