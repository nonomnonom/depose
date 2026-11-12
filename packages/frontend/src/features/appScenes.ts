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
    import('~/features/scenes/auth/LoginPage').then((m) => ({ component: m.LoginPage })),
  [Scene.Signup]: () =>
    import('~/features/scenes/auth/SignupPage').then((m) => ({ component: m.SignupPage })),
  [Scene.SetupFirm]: () =>
    import('~/features/scenes/onboarding/SetupFirmPage').then((m) => ({ component: m.SetupFirmPage })),
  [Scene.Invitation]: () =>
    import('~/features/scenes/invitations/InvitationPage').then((m) => ({ component: m.InvitationPage })),

  [Scene.Matters]: () =>
    import('~/features/scenes/matters/MattersPage').then((m) => ({ component: m.MattersPage })),
  [Scene.Notifications]: () =>
    import('~/features/scenes/notifications/NotificationsPage').then((m) => ({ component: m.NotificationsPage })),
  [Scene.AiElements]: () =>
    import('~/features/scenes/ai/AiElementsPage').then((m) => ({ component: m.AiElementsPage })),
  [Scene.SettingsFirm]: () =>
    import('~/features/scenes/settings/firm/FirmSettingsResource').then((m) => ({
      component: m.FirmSettingsResourcePage,
    })),
  [Scene.SettingsMembers]: () =>
    import('~/features/scenes/settings/members/MembersPage').then((m) => ({ component: m.MembersPage })),
  [Scene.SettingsDomains]: () =>
    import('~/features/scenes/settings/firm/FirmSettingsDomains').then((m) => ({
      component: m.FirmDomainsList,
    })),
  [Scene.SettingsAi]: () =>
    import('~/features/scenes/settings/ai/AiProvidersPage').then((m) => ({ component: m.AiProvidersPage })),
  [Scene.SettingsMcp]: () =>
    import('~/features/scenes/settings/mcp/McpSettingsPage').then((m) => ({ component: m.McpSettingsPage })),
  [Scene.SettingsProfile]: () =>
    import('~/features/scenes/settings/user/ProfileSettingsPage').then((m) => ({
      component: m.ProfileSettingsPage,
    })),
  [Scene.SettingsNotifications]: () =>
    import('~/features/scenes/settings/user/NotificationSettingsPage').then((m) => ({
      component: m.NotificationSettingsPage,
    })),
  [Scene.SettingsAppearance]: () =>
    import('~/features/scenes/settings/user/AppearanceSettingsPage').then((m) => ({
      component: m.AppearanceSettingsPage,
    })),

  [Scene.MatterSummary]: () =>
    import('~/features/scenes/matter/SummaryPage').then((m) => ({ component: m.SummaryPage })),
  [Scene.MatterFacts]: () =>
    import('~/features/scenes/facts/FactsPage').then((m) => ({ component: m.FactsPage })),
  [Scene.MatterChronologies]: () =>
    import('~/features/scenes/matter/ChronologyPage').then((m) => ({ component: m.ChronologyPage })),
  [Scene.MatterInconsistencies]: () =>
    import('~/features/scenes/matter/ContradictionsPage').then((m) => ({
      component: m.ContradictionsPage,
    })),
  [Scene.MatterReports]: () =>
    import('~/features/scenes/matter/OutputsPage').then((m) => ({ component: m.OutputsPage })),
  [Scene.MatterReport]: () =>
    import('~/features/scenes/matter/OutputDetailPage').then((m) => ({ component: m.OutputDetailPage })),
  [Scene.MatterEntities]: () =>
    import('~/features/scenes/matter/EntitiesPage').then((m) => ({ component: m.EntitiesPage })),
  [Scene.MatterDocuments]: () =>
    import('~/features/scenes/documents/DocumentsPage').then((m) => ({ component: m.DocumentsPage })),
  [Scene.MatterDocument]: () =>
    import('~/features/scenes/documents/DocumentViewerPage').then((m) => ({
      component: m.DocumentViewerPage,
    })),
  [Scene.MatterSubsets]: () =>
    import('~/features/scenes/subsets/SubsetsPage').then((m) => ({ component: m.SubsetsPage })),
  [Scene.MatterSubset]: () =>
    import('~/features/scenes/subsets/SubsetWorkspacePage').then((m) => ({
      component: m.SubsetWorkspacePage,
    })),
  [Scene.MatterSearch]: () =>
    import('~/features/scenes/search/SearchPage').then((m) => ({ component: m.SearchPage })),
  [Scene.MatterKim]: () => import('~/features/scenes/ai/AiPage').then((m) => ({ component: m.AiPage })),
  [Scene.MatterRealtime]: () =>
    import('~/features/scenes/matter/LivePage').then((m) => ({ component: m.LivePage })),
  [Scene.MatterSettings]: () =>
    import('~/features/scenes/settings/MatterSettingsPage').then((m) => ({
      component: m.MatterSettingsPage,
    })),

  [Scene.Error404]: () => Promise.resolve({ component: NotFoundPage }),
  [Scene.Error403]: () => Promise.resolve({ component: ForbiddenPage }),
};
