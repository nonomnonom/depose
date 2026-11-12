import { sceneConfigurations, Scene, type LayoutMode } from './sceneTypes';

export function sceneForPath(pathname: string): Scene {
  const matterMatch = pathname.match(/^\/matters\/([^/]+)(\/.*)?$/);
  if (matterMatch) {
    const section = matterMatch[2] ?? '';
    const [segment, ...rest] = section.split('/').filter(Boolean);
    if (segment === 'summary') return Scene.MatterSummary;
    if (segment === 'data') {
      const sub = rest[0];
      switch (sub) {
        case 'chronologies':
          return Scene.MatterDataChronologies;
        case 'inconsistencies':
          return Scene.MatterDataInconsistencies;
        case 'reports':
          return Scene.MatterDataReports;
        case 'entities':
          return Scene.MatterDataEntities;
        case 'documents':
          return rest[1] ? Scene.MatterDataDocumentsViewer : Scene.MatterDataDocuments;
        case 'subsets':
          return rest[1] ? Scene.MatterDataSubsetsWorkspace : Scene.MatterDataSubsets;
        default:
          return Scene.MatterDataFacts;
      }
    }
    if (segment === 'kim') return Scene.MatterKim;
    if (segment === 'realtime') return Scene.MatterRealtime;
    if (segment === 'settings') return Scene.MatterSettings;
    if (segment === 'search') return Scene.MatterSearch;
  }
  if (pathname === '/matters') return Scene.Matters;
  if (pathname === '/help' || pathname.startsWith('/help/')) return Scene.Help;
  if (pathname === '/settings' || pathname.startsWith('/settings/')) return Scene.Settings;
  if (pathname === '/notifications') return Scene.Notifications;
  if (pathname === '/login') return Scene.Login;
  if (pathname === '/signup') return Scene.Signup;
  if (pathname === '/setup') return Scene.Onboarding;
  if (pathname.startsWith('/invitations/')) return Scene.Onboarding;
  return Scene.Matters;
}

export function sceneLayout(scene: Scene): LayoutMode {
  switch (scene) {
    case Scene.Login:
    case Scene.Signup:
      return 'bare';
    case Scene.Onboarding:
      return 'minimal';
    case Scene.Matters:
    case Scene.Help:
    case Scene.Settings:
    case Scene.Notifications:
      return 'app';
    default:
      return 'matter';
  }
}

export function sceneName(scene: Scene): string {
  return sceneConfigurations[scene].name;
}

export function sceneConfig(scene: Scene) {
  return sceneConfigurations[scene];
}

