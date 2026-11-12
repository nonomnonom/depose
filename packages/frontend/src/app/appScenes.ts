import { ForbiddenPage, NotFoundPage } from '~/layout/ErrorPage';

import { Scene } from './sceneTypes';
import type { SceneExport } from './sceneTypes';

/**
 * Lazy scene registry (PostHog `scenes/appScenes.ts`).
 * Each entry resolves to a SceneExport; nothing here imports a layout or
 * hardcodes navigation. Error scenes are preloaded like PostHog's
 * `preloadedScenes` so a missing chunk can never hide an error page.
 */
export const appScenes: Record<Scene, () => Promise<SceneExport>> = {
  [Scene.Login]: () =>
    import('~/scenes/auth/LoginPage').then((m) => ({ component: m.LoginPage })),
  [Scene.Signup]: () =>
    import('~/scenes/auth/SignupPage').then((m) => ({ component: m.SignupPage })),
  [Scene.SetupFirm]: () =>
    import('~/scenes/onboarding/SetupFirmPage').then((m) => ({ component: m.SetupFirmPage })),
  [Scene.Invitation]: () =>
    import('~/scenes/invitations/InvitationPage').then((m) => ({ component: m.InvitationPage })),

  [Scene.Matters]: () =>
    import('~/scenes/matters/MattersPage').then((m) => ({ component: m.MattersPage })),
  [Scene.Notifications]: () =>
    import('~/scenes/notifications/NotificationsPage').then((m) => ({ component: m.NotificationsPage })),
  [Scene.SettingsFirm]: () =>
    import('~/scenes/settings/firm/FirmSettingsResource').then((m) => ({
      component: m.FirmSettingsResourcePage,
    })),
  [Scene.SettingsMembers]: () =>
    import('~/scenes/settings/members/MembersPage').then((m) => ({ component: m.MembersPage })),
  [Scene.SettingsDomains]: () =>
    import('~/scenes/settings/firm/FirmSettingsDomains').then((m) => ({
      component: m.FirmDomainsList,
    })),
  [Scene.SettingsAi]: () =>
    import('~/scenes/settings/ai/AiProvidersPage').then((m) => ({ component: m.AiProvidersPage })),
  [Scene.SettingsMcp]: () =>
    import('~/scenes/settings/mcp/McpSettingsPage').then((m) => ({ component: m.McpSettingsPage })),
  [Scene.SettingsProfile]: () =>
    import('~/scenes/settings/user/ProfileSettingsPage').then((m) => ({
      component: m.ProfileSettingsPage,
    })),
  [Scene.SettingsNotifications]: () =>
    import('~/scenes/settings/user/NotificationSettingsPage').then((m) => ({
      component: m.NotificationSettingsPage,
    })),
  [Scene.SettingsAppearance]: () =>
    import('~/scenes/settings/user/AppearanceSettingsPage').then((m) => ({
      component: m.AppearanceSettingsPage,
    })),

  [Scene.MatterSummary]: () =>
    import('~/scenes/matter/SummaryPage').then((m) => ({ component: m.SummaryPage })),
  [Scene.MatterFacts]: () =>
    import('~/scenes/facts/FactsPage').then((m) => ({ component: m.FactsPage })),
  [Scene.MatterChronologies]: () =>
    import('~/scenes/matter/ChronologyPage').then((m) => ({ component: m.ChronologyPage })),
  [Scene.MatterInconsistencies]: () =>
    import('~/scenes/matter/ContradictionsPage').then((m) => ({
      component: m.ContradictionsPage,
    })),
  [Scene.MatterReports]: () =>
    import('~/scenes/matter/OutputsPage').then((m) => ({ component: m.OutputsPage })),
  [Scene.MatterReport]: () =>
    import('~/scenes/matter/OutputDetailPage').then((m) => ({ component: m.OutputDetailPage })),
  [Scene.MatterEntities]: () =>
    import('~/scenes/matter/EntitiesPage').then((m) => ({ component: m.EntitiesPage })),
  [Scene.MatterDocuments]: () =>
    import('~/scenes/documents/DocumentsPage').then((m) => ({ component: m.DocumentsPage })),
  [Scene.MatterDocument]: () =>
    import('~/scenes/documents/DocumentViewerPage').then((m) => ({
      component: m.DocumentViewerPage,
    })),
  [Scene.MatterSubsets]: () =>
    import('~/scenes/subsets/SubsetsPage').then((m) => ({ component: m.SubsetsPage })),
  [Scene.MatterSubset]: () =>
    import('~/scenes/subsets/SubsetWorkspacePage').then((m) => ({
      component: m.SubsetWorkspacePage,
    })),
  [Scene.MatterSearch]: () =>
    import('~/scenes/search/SearchPage').then((m) => ({ component: m.SearchPage })),
  [Scene.MatterKim]: () => import('~/scenes/ai/AiPage').then((m) => ({ component: m.AiPage })),
  [Scene.MatterRealtime]: () =>
    import('~/scenes/matter/LivePage').then((m) => ({ component: m.LivePage })),
  [Scene.MatterSettings]: () =>
    import('~/scenes/settings/MatterSettingsPage').then((m) => ({
      component: m.MatterSettingsPage,
    })),

  [Scene.Error404]: () => Promise.resolve({ component: NotFoundPage }),
  [Scene.Error403]: () => Promise.resolve({ component: ForbiddenPage }),
};
