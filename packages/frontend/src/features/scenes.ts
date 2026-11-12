import { Scene, type SceneConfig } from './sceneTypes';
import { urls } from './urls';

/**
 * Per-scene declarations. The router never decides which shell a screen gets:
 * `Navigation` reads `sceneConfig.layout` and `sceneConfig.sidebar` for the
 * active scene (PostHog `scenes/scenes.ts` -> `sceneConfigurations`).
 */
export const sceneConfigurations: Record<Scene, SceneConfig> = {
  [Scene.Login]: { name: 'Log in', layout: 'plain', onlyUnauthenticated: true },
  [Scene.Signup]: { name: 'Sign up', layout: 'plain', onlyUnauthenticated: true },
  [Scene.SetupFirm]: { name: 'Set up your firm', layout: 'plain', setupOnly: true },
  [Scene.Invitation]: { name: 'Invitation', layout: 'plain', allowUnauthenticated: true },
  [Scene.Home]: { name: 'Home', layout: 'app' },

  [Scene.Matters]: { name: 'Matters', layout: 'app' },
  [Scene.Notifications]: { name: 'Notifications', layout: 'app' },
  [Scene.AiElements]: { name: 'AI Elements', layout: 'app' },
  [Scene.Settings]: { name: 'Settings', layout: 'app', sidebar: 'settings' },

  [Scene.MatterSummary]: { name: 'Summary', layout: 'matter', matterSection: 'summary', sidebar: 'data', sidebarItem: 'summary' },
  [Scene.MatterHome]: { name: 'Home', layout: 'matter', matterSection: 'home' },
  [Scene.MatterFacts]: {
    name: 'Facts',
    layout: 'matter',
    matterSection: 'data',
    sidebar: 'data',
    sidebarItem: 'facts',
  },
  [Scene.MatterChronologies]: {
    name: 'Chronologies',
    layout: 'matter',
    matterSection: 'data',
    sidebar: 'data',
    sidebarItem: 'chronologies',
  },
  [Scene.MatterInconsistencies]: {
    name: 'Inconsistencies',
    layout: 'matter',
    matterSection: 'data',
    sidebar: 'data',
    sidebarItem: 'inconsistencies',
  },
  [Scene.MatterReports]: {
    name: 'Reports',
    layout: 'matter',
    matterSection: 'data',
    sidebar: 'data',
    sidebarItem: 'reports',
  },
  [Scene.MatterReport]: {
    name: 'Report',
    layout: 'matter',
    matterSection: 'data',
    sidebar: 'data',
    sidebarItem: 'reports',
  },
  [Scene.MatterEntities]: {
    name: 'Entities',
    layout: 'matter',
    matterSection: 'data',
    sidebar: 'data',
    sidebarItem: 'entities',
  },
  [Scene.MatterDocuments]: {
    name: 'Documents',
    layout: 'matter',
    matterSection: 'data',
    sidebar: 'data',
    sidebarItem: 'documents',
  },
  [Scene.MatterDocument]: {
    name: 'Document',
    layout: 'matter-raw',
    matterSection: 'data',
    sidebarItem: 'documents',
  },
  [Scene.MatterSubsets]: {
    name: 'Subsets',
    layout: 'matter',
    matterSection: 'data',
    sidebar: 'data',
    sidebarItem: 'subsets',
  },
  [Scene.MatterSubset]: {
    name: 'Subset',
    layout: 'matter-raw',
    matterSection: 'data',
    sidebarItem: 'subsets',
  },
  [Scene.MatterSearch]: {
    name: 'Search',
    layout: 'matter',
    matterSection: 'data',
    sidebar: 'data',
    sidebarItem: 'search',
  },
  [Scene.MatterChats]: { name: 'Chats', layout: 'matter-raw', matterSection: 'chats' },
  [Scene.MatterRealtime]: { name: 'Real-time', layout: 'matter-raw', matterSection: 'realtime' },

  [Scene.Error404]: { name: 'Page not found', layout: 'app', allowUnauthenticated: true },
  [Scene.Error403]: { name: 'Access denied', layout: 'app', allowUnauthenticated: true },
};

export type RedirectTarget = string | ((params: Record<string, string | undefined>) => string);

/** Legacy / short links. Nothing here is a product feature. */
export const redirects: Record<string, RedirectTarget> = {
  '/matters/:matterId': ({ matterId }) => urls.matterSummary(matterId ?? ''),
  '/matters/:matterId/data': ({ matterId }) => urls.matterFacts(matterId ?? ''),
  '/matters/:matterId/overview': ({ matterId }) => urls.matterSummary(matterId ?? ''),
  '/matters/:matterId/intelligence': ({ matterId }) => urls.matterInconsistencies(matterId ?? ''),
  '/matters/:matterId/facts': ({ matterId }) => urls.matterFacts(matterId ?? ''),
  '/matters/:matterId/chronology': ({ matterId }) => urls.matterChronologies(matterId ?? ''),
  '/matters/:matterId/entities': ({ matterId }) => urls.matterEntities(matterId ?? ''),
  '/matters/:matterId/outputs': ({ matterId }) => urls.matterReports(matterId ?? ''),
  '/matters/:matterId/documents': ({ matterId }) => urls.matterDocuments(matterId ?? ''),
  '/matters/:matterId/subsets': ({ matterId }) => urls.matterSubsets(matterId ?? ''),
  '/matters/:matterId/kim': ({ matterId }) => urls.matterChats(matterId ?? ''),
  '/matters/:matterId/ai': ({ matterId }) => urls.matterChats(matterId ?? ''),
  '/matters/:matterId/search': ({ matterId }) => urls.matterSearch(matterId ?? ''),
  '/matters/:matterId/settings': () => urls.settingsSection('matter-general'),
  '/matters/:matterId/settings/subsets': () => urls.settingsSection('matter-subsets'),

  // Pre-unified settings URLs (PostHog-style: replace with `replace` semantics).
  '/settings/firm': () => urls.settingsSection('firm-general'),
  '/settings/firm/members': () => urls.settingsSection('firm-members'),
  '/settings/firm/domains': () => urls.settingsSection('firm-domains'),
  '/settings/firm/ai': () => urls.settingsSection('firm-ai'),
  '/settings/firm/integrations/mcp': () => urls.settingsSection('firm-integrations'),
  '/settings/user': () => urls.settingsSection('user-profile'),
  '/settings/user/profile': () => urls.settingsSection('user-profile'),
  '/settings/user/notifications': () => urls.settingsSection('user-notifications'),
  '/settings/user/appearance': () => urls.settingsSection('user-appearance'),
  '/settings/profile': () => urls.settingsSection('user-profile'),
};

/** URL -> [scene, sceneKey]. Scene keys disambiguate several routes for one scene. */
export const routes: Record<string, [Scene, string]> = {
  [urls.login()]: [Scene.Login, 'login'],
  [urls.signup()]: [Scene.Signup, 'signup'],
  [urls.home()]: [Scene.Home, 'home'],
  [urls.setup()]: [Scene.SetupFirm, 'setupFirm'],
  [urls.invitation()]: [Scene.Invitation, 'invitation'],

  [urls.matters()]: [Scene.Matters, 'matters'],
  [urls.notifications()]: [Scene.Notifications, 'notifications'],
  [urls.aiElements()]: [Scene.AiElements, 'aiElements'],
  [urls.settings()]: [Scene.Settings, 'settingsRoot'],
  [urls.settingsSection()]: [Scene.Settings, 'settingsSection'],

  [urls.matterSummary()]: [Scene.MatterSummary, 'matterSummary'],
  [urls.matterHome()]: [Scene.MatterHome, 'matterHome'],
  [urls.matterFacts()]: [Scene.MatterFacts, 'matterFacts'],
  [urls.matterChronologies()]: [Scene.MatterChronologies, 'matterChronologies'],
  [urls.matterInconsistencies()]: [Scene.MatterInconsistencies, 'matterInconsistencies'],
  [urls.matterReports()]: [Scene.MatterReports, 'matterReports'],
  [urls.matterReport()]: [Scene.MatterReport, 'matterReport'],
  [urls.matterEntities()]: [Scene.MatterEntities, 'matterEntities'],
  [urls.matterDocuments()]: [Scene.MatterDocuments, 'matterDocuments'],
  [urls.matterDocument()]: [Scene.MatterDocument, 'matterDocument'],
  [urls.matterSubsets()]: [Scene.MatterSubsets, 'matterSubsets'],
  [urls.matterSubset()]: [Scene.MatterSubset, 'matterSubset'],
  [urls.matterSearch()]: [Scene.MatterSearch, 'matterSearch'],
  [urls.matterChats()]: [Scene.MatterChats, 'matterChats'],
  [urls.matterRealtime()]: [Scene.MatterRealtime, 'matterRealtime'],

  [urls.error403()]: [Scene.Error403, 'error403'],
  [urls.error404()]: [Scene.Error404, 'error404'],
};
