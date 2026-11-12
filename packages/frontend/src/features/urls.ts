/**
 * Single source of truth for paths (PostHog `scenes/urls.ts`).
 *
 * Every builder accepts `:param` placeholders so the same function produces
 * both a real link and a route pattern for the scene registry.
 *
 * To add a URL: add a builder here, a Scene in sceneTypes.ts, a config + route
 * in scenes.ts, and a lazy import in appScenes.ts.
 */

const matter = (matterId = ':matterId'): string => `/matters/${matterId}`;
const data = (matterId = ':matterId'): string => `${matter(matterId)}/data`;
const subset = (matterId = ':matterId', subsetId = ':subsetId'): string =>
  `${data(matterId)}/subsets/${subsetId}`;
const document = (matterId = ':matterId', documentId = ':documentId'): string =>
  `${data(matterId)}/documents/${documentId}`;
const report = (matterId = ':matterId', outputId = ':outputId'): string =>
  `${data(matterId)}/reports/${outputId}`;

export const urls = {
  // Authentication / bootstrap
  login: (): string => '/login',
  signup: (): string => '/signup',
  setup: (): string => '/setup',
  invitation: (token = ':token'): string => `/invitations/${token}`,

  // Workspace
  home: (): string => '/home',
  matters: (): string => '/matters',
  notifications: (): string => '/notifications',
  aiElements: (): string => '/ai-elements',
  settings: (): string => '/settings',
  /** One unified settings scene; section ids are scope-prefixed (PostHog scheme). */
  settingsSection: (section = ':section'): string => `/settings/${section}`,

  // Matter (matter = project, the primary context — PostHog /project/:id/...)
  matter,
  matterHome: (matterId = ':matterId'): string => `${matter(matterId)}/home`,
  matterSummary: (matterId = ':matterId'): string => `${matter(matterId)}/summary`,
  matterData: data,
  matterFacts: (matterId = ':matterId'): string => `${data(matterId)}/facts`,
  matterChronologies: (matterId = ':matterId'): string => `${data(matterId)}/chronologies`,
  matterInconsistencies: (matterId = ':matterId'): string => `${data(matterId)}/inconsistencies`,
  matterReports: (matterId = ':matterId'): string => `${data(matterId)}/reports`,
  matterReport: report,
  matterEntities: (matterId = ':matterId'): string => `${data(matterId)}/entities`,
  matterDocuments: (matterId = ':matterId'): string => `${data(matterId)}/documents`,
  matterDocument: document,
  matterSubsets: (matterId = ':matterId'): string => `${data(matterId)}/subsets`,
  matterSubset: subset,
  matterSearch: (matterId = ':matterId'): string => `${data(matterId)}/search`,
  matterChats: (matterId = ':matterId'): string => `${matter(matterId)}/chats`,
  matterRealtime: (matterId = ':matterId'): string => `${matter(matterId)}/realtime`,

  // Errors
  error403: (): string => '/403',
  error404: (): string => '/404',

  /** Where a guest is sent after logging in. */
  default: (): string => '/home',
};
