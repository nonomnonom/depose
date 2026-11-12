import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import { Scene } from './sceneTypes';

export const appScenes: Record<Scene, LazyExoticComponent<ComponentType>> = {
  [Scene.Matters]: lazy(() => import('~/scenes/matters/MattersPage').then((m) => ({ default: m.MattersPage }))),
  [Scene.MatterSummary]: lazy(() => import('~/scenes/matter/SummaryPage').then((m) => ({ default: m.SummaryPage }))),
  [Scene.MatterData]: lazy(() => import('~/layout/matter/MatterLayout').then((m) => ({ default: m.MatterLayout }))),
  [Scene.MatterDataFacts]: lazy(() => import('~/scenes/facts/FactsPage').then((m) => ({ default: m.FactsPage }))),
  [Scene.MatterDataChronologies]: lazy(() => import('~/scenes/matter/ChronologyPage').then((m) => ({ default: m.ChronologyPage }))),
  [Scene.MatterDataInconsistencies]: lazy(() => import('~/scenes/matter/ContradictionsPage').then((m) => ({ default: m.ContradictionsPage }))),
  [Scene.MatterDataReports]: lazy(() => import('~/scenes/matter/OutputsPage').then((m) => ({ default: m.OutputsPage }))),
  [Scene.MatterDataEntities]: lazy(() => import('~/scenes/matter/EntitiesPage').then((m) => ({ default: m.EntitiesPage }))),
  [Scene.MatterDataDocuments]: lazy(() => import('~/scenes/documents/DocumentsPage').then((m) => ({ default: m.DocumentsPage }))),
  [Scene.MatterDataSubsets]: lazy(() => import('~/scenes/subsets/SubsetsPage').then((m) => ({ default: m.SubsetsPage }))),
  [Scene.MatterDataSubsetsWorkspace]: lazy(() => import('~/scenes/subsets/SubsetWorkspacePage').then((m) => ({ default: m.SubsetWorkspacePage }))),
  [Scene.MatterDataDocumentsViewer]: lazy(() => import('~/scenes/documents/DocumentViewerPage').then((m) => ({ default: m.DocumentViewerPage }))),
  [Scene.MatterKim]: lazy(() => import('~/scenes/ai/AiPage').then((m) => ({ default: m.AiPage }))),
  [Scene.MatterRealtime]: lazy(() => import('~/scenes/matter/LivePage').then((m) => ({ default: m.LivePage }))),
  [Scene.MatterSettings]: lazy(() => import('~/scenes/settings/MatterSettingsPage').then((m) => ({ default: m.MatterSettingsPage }))),
  [Scene.MatterSearch]: lazy(() => import('~/scenes/search/SearchPage').then((m) => ({ default: m.SearchPage }))),
  [Scene.Help]: lazy(() => import('~/scenes/help/HelpPage').then((m) => ({ default: m.HelpPage }))),
  [Scene.Settings]: lazy(() => import('~/layout/settings/SettingsLayout').then((m) => ({ default: m.SettingsLayout }))),
  [Scene.Notifications]: lazy(() => import('~/scenes/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))),
  [Scene.Login]: lazy(() => import('~/scenes/auth/LoginPage').then((m) => ({ default: m.LoginPage }))),
  [Scene.Signup]: lazy(() => import('~/scenes/auth/SignupPage').then((m) => ({ default: m.SignupPage }))),
  [Scene.Onboarding]: lazy(() => import('~/scenes/onboarding/SetupFirmPage').then((m) => ({ default: m.SetupFirmPage }))),
};
