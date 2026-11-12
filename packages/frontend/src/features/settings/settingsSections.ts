import { urls } from '~/features/urls';

/**
 * The unified settings registry (PostHog `scenes/settings`): one scene at
 * `/settings/:section`, sections grouped into scopes — Matter (project),
 * Firm (organisation), User. The Danger zone is rendered last, in red.
 */
export type SettingsScope = 'matter' | 'firm' | 'user';

export interface SettingsSectionDef {
  id: string;
  scope: SettingsScope;
  label: string;
  description?: string;
  permission?: string;
  /** Matter sections need a matter in context; hidden/disabled otherwise. */
  matterRequired?: boolean;
  danger?: boolean;
}

export const SETTINGS_SCOPES: Array<{ id: SettingsScope; label: string; defaultSection: string }> = [
  { id: 'user', label: 'User', defaultSection: 'user-profile' },
  { id: 'firm', label: 'Firm', defaultSection: 'firm-general' },
  { id: 'matter', label: 'Matter', defaultSection: 'matter-general' },
];

export const settingsHref = (sectionId: string): string => urls.settingsSection(sectionId);

export const settingsSections: SettingsSectionDef[] = [
  {
    id: 'matter-general',
    scope: 'matter',
    label: 'General',
    description: 'Matter identity, numbering, and status.',
    permission: 'matter.read',
    matterRequired: true, // replaced lazily by SettingsScene
  },
  {
    id: 'matter-subsets',
    scope: 'matter',
    label: 'Subsets',
    description: 'Scoped documents, issues, and chats.',
    permission: 'subset.read',
    matterRequired: true,
  },
  {
    id: 'firm-general',
    scope: 'firm',
    label: 'General',
    description: 'Firm identity and defaults.',
    permission: 'firm.read',
  },
  {
    id: 'firm-members',
    scope: 'firm',
    label: 'Members',
    description: 'People in the firm and their roles.',
    permission: 'firm.member.manage',
  },
  {
    id: 'firm-domains',
    scope: 'firm',
    label: 'Domains',
    description: 'Email domains used for auto-join.',
    permission: 'firm.read',
  },
  {
    id: 'firm-ai',
    scope: 'firm',
    label: 'AI',
    description: 'Model providers and AI behavior.',
    permission: 'firm.update',
  },
  {
    id: 'firm-integrations',
    scope: 'firm',
    label: 'Integrations',
    description: 'MCP servers and external tools.',
    permission: 'firm.mcp.manage',
  },
  {
    id: 'user-profile',
    scope: 'user',
    label: 'Profile',
    description: 'Your name, email, and credentials.',
  },
  {
    id: 'user-notifications',
    scope: 'user',
    label: 'Notifications',
    description: 'What emails and digests you receive.',
  },
  {
    id: 'user-appearance',
    scope: 'user',
    label: 'Appearance',
    description: 'Theme and display preferences.',
  },
];

export function settingsSectionById(id: string | undefined): SettingsSectionDef | undefined {
  return settingsSections.find((section) => section.id === id);
}

export function defaultSectionForScope(scope: SettingsScope): string {
  return SETTINGS_SCOPES.find((entry) => entry.id === scope)?.defaultSection ?? 'firm-general';
}
