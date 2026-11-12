import { ForbiddenPage, NotFoundPage } from '~/features/layout/ErrorPage';

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
    import('~/features/auth/login/LoginPage').then((m) => ({ component: m.LoginPage })),
  [Scene.Signup]: () =>
    import('~/features/auth/signup/SignupPage').then((m) => ({ component: m.SignupPage })),
  [Scene.SetupFirm]: () =>
    import('~/features/auth/setup/SetupFirmPage').then((m) => ({ component: m.SetupFirmPage })),
  [Scene.Invitation]: () =>
    import('~/features/auth/invitation/InvitationPage').then((m) => ({ component: m.InvitationPage })),

  [Scene.Matters]: () =>
    import('~/features/matters/MattersPage').then((m) => ({ component: m.MattersPage })),
  [Scene.Notifications]: () =>
    import('~/features/notifications/NotificationsPage').then((m) => ({ component: m.NotificationsPage })),
  [Scene.AiElements]: () =>
    import('~/features/ai/AiElementsPage').then((m) => ({ component: m.AiElementsPage })),
  [Scene.SettingsFirm]: () =>
    import('~/features/settings/firm/FirmSettingsResource').then((m) => ({
      component: m.FirmSettingsResourcePage,
    })),
  [Scene.SettingsMembers]: () =>
    import('~/features/settings/members/MembersPage').then((m) => ({ component: m.MembersPage })),
  [Scene.SettingsDomains]: () =>
    import('~/features/settings/firm/FirmSettingsDomains').then((m) => ({
      component: m.FirmDomainsList,
    })),
  [Scene.SettingsAi]: () =>
    import('~/features/settings/ai/AiProvidersPage').then((m) => ({ component: m.AiProvidersPage })),
  [Scene.SettingsMcp]: () =>
    import('~/features/settings/mcp/McpSettingsPage').then((m) => ({ component: m.McpSettingsPage })),
  [Scene.SettingsProfile]: () =>
    import('~/features/settings/user/ProfileSettingsPage').then((m) => ({
      component: m.ProfileSettingsPage,
    })),
  [Scene.SettingsNotifications]: () =>
    import('~/features/settings/user/NotificationSettingsPage').then((m) => ({
      component: m.NotificationSettingsPage,
    })),
  [Scene.SettingsAppearance]: () =>
    import('~/features/settings/user/AppearanceSettingsPage').then((m) => ({ component: m.AppearanceSettingsPage })),

  [Scene.MatterSummary]: () =>
    import('~/features/matter/summary/SummaryPage').then((m) => ({ component: m.SummaryPage })),
  [Scene.MatterFacts]: () =>
    import('~/features/facts/FactsPage').then((m) => ({ component: m.FactsPage })),
  [Scene.MatterChronologies]: () =>
    import('~/features/matter/chronologies/ChronologyPage').then((m) => ({ component: m.ChronologyPage })),
  [Scene.MatterInconsistencies]: () =>
    import('~/features/matter/inconsistencies/ContradictionsPage').then((m) => ({
      component: m.ContradictionsPage,
    })),
  [Scene.MatterReports]: () =>
    import('~/features/matter/outputs/OutputsPage').then((m) => ({ component: m.OutputsPage })),
  [Scene.MatterReport]: () =>
    import('~/features/matter/outputs/OutputDetailPage').then((m) => ({ component: m.OutputDetailPage })),
  [Scene.MatterEntities]: () =>
    import('~/features/matter/entities/EntitiesPage').then((m) => ({ component: m.EntitiesPage })),
  [Scene.MatterDocuments]: () =>
    import('~/features/documents/DocumentsPage').then((m) => ({ component: m.DocumentsPage })),
  [Scene.MatterDocument]: () =>
    import('~/features/documents/DocumentViewerPage').then((m) => ({
      component: m.DocumentViewerPage,
    })),
  [Scene.MatterSubsets]: () =>
    import('~/features/settings/subset/SubsetsPage').then((m) => ({ component: m.SubsetsPage })),
  [Scene.MatterSubset]: () =>
    import('~/features/settings/subset/SubsetWorkspacePage').then((m) => ({ component: m.SubsetWorkspacePage })),
  [Scene.MatterSearch]: () =>
    import('~/features/search/SearchPage').then((m) => ({ component: m.SearchPage })),
  [Scene.MatterKim]: () => import('~/features/ai/AiPage').then((m) => ({ component: m.AiPage })),
  [Scene.MatterRealtime]: () =>
    import('~/features/matter/realtime/LivePage').then((m) => ({ component: m.LivePage })),
  [Scene.MatterSettings]: () =>
    import('~/features/settings/MatterSettingsPage').then((m) => ({
      component: m.MatterSettingsPage,
    })),

  [Scene.Error404]: () => Promise.resolve({ component: NotFoundPage }),
  [Scene.Error403]: () => Promise.resolve({ component: ForbiddenPage }),
};
