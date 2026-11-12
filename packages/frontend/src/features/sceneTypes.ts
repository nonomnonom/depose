import type { ComponentType } from 'react';

/**
 * The scene registry. Mirrors PostHog's `scenes/sceneTypes.ts`:
 * a scene is an id, a config, and a lazily loaded export.
 * Adding a scene means touching sceneTypes.ts, urls.ts, scenes.ts and appScenes.ts.
 */
export const Scene = {
  Login: 'Login',
  Signup: 'Signup',
  SetupFirm: 'SetupFirm',
  Invitation: 'Invitation',
  Home: 'Home',

  Matters: 'Matters',
  Notifications: 'Notifications',
  Settings: 'Settings',

  MatterSummary: 'MatterSummary',
  MatterHome: 'MatterHome',
  MatterFacts: 'MatterFacts',
  MatterChronologies: 'MatterChronologies',
  MatterInconsistencies: 'MatterInconsistencies',
  MatterReports: 'MatterReports',
  MatterReport: 'MatterReport',
  MatterEntities: 'MatterEntities',
  MatterDocuments: 'MatterDocuments',
  MatterDocument: 'MatterDocument',
  MatterSubsets: 'MatterSubsets',
  MatterSubset: 'MatterSubset',
  MatterSearch: 'MatterSearch',
  MatterChats: 'MatterChats',
  MatterRealtime: 'MatterRealtime',

  /** Component gallery for the shared AI Elements patterns. */
  AiElements: 'AiElements',

  Error404: 'Error404',
  Error403: 'Error403',
} as const;

export type Scene = (typeof Scene)[keyof typeof Scene];

/**
 * `plain`     - no shell (auth, setup, invitations)
 * `app`       - workspace shell: global rail + breadcrumb bar + padded content
 * `matter`    - matter shell: global rail + breadcrumb bar + matter tabs + optional data sidebar
 * `matter-raw`- matter shell without default padding, for full-bleed split panes
 */
export type LayoutMode = 'plain' | 'app' | 'matter' | 'matter-raw';

export type MatterSection = 'home' | 'summary' | 'data' | 'chats' | 'realtime' | 'settings';

export interface SceneConfig {
  name: string;
  layout: LayoutMode;
  /** Only reachable while logged out (PostHog: onlyUnauthenticated). */
  onlyUnauthenticated?: boolean;
  /** Reachable both logged in and logged out (PostHog: allowUnauthenticated). */
  allowUnauthenticated?: boolean;
  /** This scene is the firm bootstrap flow, so it bypasses the setup gate. */
  setupOnly?: boolean;
  /** Which matter tab is active. Drives navigation state, never the router. */
  matterSection?: MatterSection;
  /** Contextual sidebar supplied by the layout, derived from the active scene. */
  sidebar?: 'data' | 'settings';
  /** Active entry inside that contextual sidebar. */
  sidebarItem?: string;
}

export interface SceneParams {
  params: Record<string, string | undefined>;
  searchParams: Record<string, string>;
  hashParams: Record<string, string>;
}

export const emptySceneParams: SceneParams = {
  params: {},
  searchParams: {},
  hashParams: {},
};

/** Scene components are dumb: they receive URL params, never resolve routes themselves. */
export type SceneComponentProps = Record<string, string | undefined>;

export interface SceneExport {
  component: ComponentType<SceneComponentProps>;
  /** Convert URL params into component props (PostHog: paramsToProps). */
  paramsToProps?: (params: SceneParams) => SceneComponentProps;
}
