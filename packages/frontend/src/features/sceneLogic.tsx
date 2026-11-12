import {
  createContext,
  lazy,
  useContext,
  useMemo,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';

import type { Me } from '~/types';

import { appScenes } from './appScenes';
import { sceneConfigurations } from './scenes';
import { Scene, type SceneComponentProps, type SceneConfig, type SceneParams } from './sceneTypes';
import { urls } from './urls';

/** The active scene, derived from the URL. Navigation state reads this, never the router. */
export interface ActiveScene {
  sceneId: Scene;
  sceneKey: string;
  sceneConfig: SceneConfig;
  sceneParams: SceneParams;
}

const SceneContext = createContext<ActiveScene | null>(null);

function parseHash(hash: string): Record<string, string> {
  if (!hash || hash === '#') return {};
  return Object.fromEntries(new URLSearchParams(hash.replace(/^#/, '')));
}

export function SceneProvider({
  sceneId,
  sceneKey,
  children,
}: {
  sceneId: Scene;
  sceneKey: string;
  children: ReactNode;
}): ReactNode {
  const params = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const sceneParams = useMemo<SceneParams>(
    () => ({
      params,
      searchParams: Object.fromEntries(searchParams),
      hashParams: parseHash(location.hash),
    }),
    [params, searchParams, location.hash],
  );

  const value = useMemo<ActiveScene>(
    () => ({
      sceneId,
      sceneKey,
      sceneConfig: sceneConfigurations[sceneId],
      sceneParams,
    }),
    [sceneId, sceneKey, sceneParams],
  );

  return <SceneContext.Provider value={value}>{children}</SceneContext.Provider>;
}

export function useScene(): ActiveScene {
  const value = useContext(SceneContext);
  if (!value) throw new Error('useScene must be used inside SceneProvider');
  return value;
}

/** One lazy component per scene, created on first visit (PostHog sceneLogic.loadScene). */
const sceneComponents = new Map<Scene, LazyExoticComponent<ComponentType<SceneComponentProps>>>();

export function getSceneComponent(
  sceneId: Scene,
): LazyExoticComponent<ComponentType<SceneComponentProps>> {
  const cached = sceneComponents.get(sceneId);
  if (cached) return cached;
  const importer = appScenes[sceneId];
  const component = lazy(async () => ({ default: (await importer()).component }));
  sceneComponents.set(sceneId, component);
  return component;
}

/**
 * Auth / setup gating for a scene. Kept as a pure decision so the router only
 * maps URLs to scenes (PostHog `sceneLogic.openScene` L985-1128).
 */
export type SceneAccess =
  | { kind: 'allow' }
  | { kind: 'loading' }
  | { kind: 'redirect'; to: string };

export function resolveSceneAccess(
  sceneId: Scene,
  me: Me | null,
  isLoading: boolean,
  currentPath: string,
): SceneAccess {
  const config = sceneConfigurations[sceneId];
  if (isLoading) return { kind: 'loading' };

  if (!me) {
    if (config.onlyUnauthenticated || config.allowUnauthenticated) return { kind: 'allow' };
    if (config.setupOnly) return { kind: 'redirect', to: urls.login() };
    const returnTo = currentPath === '/' ? '' : `?returnTo=${encodeURIComponent(currentPath)}`;
    return { kind: 'redirect', to: `${urls.login()}${returnTo}` };
  }

  if (config.onlyUnauthenticated) {
    return { kind: 'redirect', to: me.setupRequired ? urls.setup() : urls.default() };
  }

  const isSetupFlow = config.setupOnly;
  if (me.setupRequired && !isSetupFlow && !config.allowUnauthenticated) {
    return { kind: 'redirect', to: urls.setup() };
  }
  if (!me.setupRequired && isSetupFlow) {
    return { kind: 'redirect', to: urls.default() };
  }

  return { kind: 'allow' };
}
