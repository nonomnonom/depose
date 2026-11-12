export const Scene = {
  Matters: 'matters',
  MatterData: 'matter-data',
  MatterSummary: 'matter-summary',
  MatterDataFacts: 'matter-data-facts',
  MatterDataChronologies: 'matter-data-chronologies',
  MatterDataInconsistencies: 'matter-data-inconsistencies',
  MatterDataReports: 'matter-data-reports',
  MatterDataEntities: 'matter-data-entities',
  MatterDataDocuments: 'matter-data-documents',
  MatterDataSubsets: 'matter-data-subsets',
  MatterDataSubsetsWorkspace: 'matter-data-subsets-workspace',
  MatterDataDocumentsViewer: 'matter-data-documents-viewer',
  MatterKim: 'matter-kim',
  MatterRealtime: 'matter-realtime',
  MatterSettings: 'matter-settings',
  MatterSearch: 'matter-search',
  Help: 'help',
  Settings: 'settings',
  Notifications: 'notifications',
  Login: 'login',
  Signup: 'signup',
  Onboarding: 'onboarding',
} as const;

export type Scene = (typeof Scene)[keyof typeof Scene];

export type LayoutMode = 'bare' | 'minimal' | 'app' | 'matter';

export interface SceneConfig {
  scene: Scene;
  layout: LayoutMode;
  name: string;
}

export const sceneConfigurations: Record<Scene, SceneConfig> = {
  [Scene.Matters]: { scene: Scene.Matters, layout: 'app', name: 'Matters' },
  [Scene.MatterData]: { scene: Scene.MatterData, layout: 'matter', name: 'Data' },
  [Scene.MatterSummary]: { scene: Scene.MatterSummary, layout: 'matter', name: 'Summary' },
  [Scene.MatterDataFacts]: { scene: Scene.MatterDataFacts, layout: 'matter', name: 'Facts' },
  [Scene.MatterDataChronologies]: { scene: Scene.MatterDataChronologies, layout: 'matter', name: 'Chronologies' },
  [Scene.MatterDataInconsistencies]: { scene: Scene.MatterDataInconsistencies, layout: 'matter', name: 'Inconsistencies' },
  [Scene.MatterDataReports]: { scene: Scene.MatterDataReports, layout: 'matter', name: 'Reports' },
  [Scene.MatterDataEntities]: { scene: Scene.MatterDataEntities, layout: 'matter', name: 'Entities' },
  [Scene.MatterDataDocuments]: { scene: Scene.MatterDataDocuments, layout: 'matter', name: 'Documents' },
  [Scene.MatterDataSubsets]: { scene: Scene.MatterDataSubsets, layout: 'matter', name: 'Subsets' },
  [Scene.MatterDataSubsetsWorkspace]: { scene: Scene.MatterDataSubsetsWorkspace, layout: 'matter', name: 'Subset' },
  [Scene.MatterDataDocumentsViewer]: { scene: Scene.MatterDataDocumentsViewer, layout: 'matter', name: 'Document' },
  [Scene.MatterKim]: { scene: Scene.MatterKim, layout: 'matter', name: 'Dep AI' },
  [Scene.MatterRealtime]: { scene: Scene.MatterRealtime, layout: 'matter', name: 'Real-time' },
  [Scene.MatterSettings]: { scene: Scene.MatterSettings, layout: 'matter', name: 'Matter settings' },
  [Scene.MatterSearch]: { scene: Scene.MatterSearch, layout: 'matter', name: 'Search' },
  [Scene.Help]: { scene: Scene.Help, layout: 'app', name: 'Help Centre' },
  [Scene.Settings]: { scene: Scene.Settings, layout: 'app', name: 'Settings' },
  [Scene.Notifications]: { scene: Scene.Notifications, layout: 'app', name: 'Notifications' },
  [Scene.Login]: { scene: Scene.Login, layout: 'bare', name: 'Log in' },
  [Scene.Signup]: { scene: Scene.Signup, layout: 'bare', name: 'Sign up' },
  [Scene.Onboarding]: { scene: Scene.Onboarding, layout: 'minimal', name: 'Setup' },
};
