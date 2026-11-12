import { Link, Navigate, useParams } from 'react-router-dom';
import { Building1, Scale, User } from '@coolicons/react';
import { PageLoading } from '~/features/lib/components/PageLoading';
import { useSession } from '~/features/lib/auth/session';
import { readCurrentMatterId } from '~/features/lib/logic/currentMatter';
import { urls } from '~/features/urls';

import { MatterSettingsPage } from './MatterSettingsPage';
import { SubsetsPage } from './subset/SubsetsPage';
import { FirmSettingsResourcePage } from './firm/FirmSettingsResource';
import { FirmDomainsList } from './firm/FirmSettingsDomains';
import { MembersPage } from './members/MembersPage';
import { AiProvidersPage } from './ai/AiProvidersPage';
import { McpSettingsPage } from './mcp/McpSettingsPage';
import { ProfileSettingsPage } from './user/ProfileSettingsPage';
import { NotificationSettingsPage } from './user/NotificationSettingsPage';
import { AppearanceSettingsPage } from './user/AppearanceSettingsPage';
import {
  defaultSectionForScope,
  SETTINGS_SCOPES,
  settingsSectionById,
  type SettingsScope,
} from './settingsSections';

/**
 * Unified settings scene (PostHog `SettingsScene`): one route
 * `/settings/:section`, scope-prefixed section ids, the nav panel provided by
 * the shell's settings sidebar. Matter sections render against the current
 * (remembered) matter.
 */
const SECTION_COMPONENTS: Record<string, React.ComponentType<{ matterId?: string }>> = {
  'matter-general': MatterSettingsPage,
  'matter-subsets': SubsetsPage,
  'firm-general': FirmSettingsResourcePage,
  'firm-members': MembersPage,
  'firm-domains': FirmDomainsList,
  'firm-ai': AiProvidersPage,
  'firm-integrations': McpSettingsPage,
  'user-profile': ProfileSettingsPage,
  'user-notifications': NotificationSettingsPage,
  'user-appearance': AppearanceSettingsPage,
};

const SCOPE_ICONS = { matter: Scale, firm: Building1, user: User } as const;

/** PostHog settings breadcrumb: scope icon + "Scope / Section". */
function SettingsBreadcrumb({ scope, label }: { scope: SettingsScope; label: string }): React.ReactNode {
  const Icon = SCOPE_ICONS[scope];
  const scopeLabel = SETTINGS_SCOPES.find((entry) => entry.id === scope)?.label ?? scope;
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-6 text-sm">
      {Icon ? <Icon className="size-4 text-muted-foreground" aria-hidden="true" /> : null}
      <span className="text-muted-foreground">{scopeLabel}</span>
      <span className="text-muted-foreground/50" aria-hidden="true">/</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

export function SettingsScene(): React.ReactNode {
  const { section: sectionParam } = useParams();
  const { can } = useSession();

  if (!sectionParam) {
    return <Navigate to={urls.settingsSection(defaultSectionForScope('firm'))} replace />;
  }

  const def = settingsSectionById(sectionParam);
  if (!def) {
    return <Navigate to={urls.settingsSection(defaultSectionForScope('firm'))} replace />;
  }

  const breadcrumb = <SettingsBreadcrumb scope={def.scope} label={def.label} />;

  if (def.permission && !can(def.permission)) {
    return (
      <>
        {breadcrumb}
        <div className="p-6">
          <div className="rounded-xl border border-border bg-card px-6 py-8 text-sm text-muted-foreground">
            You do not have access to this settings section.
          </div>
        </div>
      </>
    );
  }

  const SectionComponent = SECTION_COMPONENTS[def.id];
  if (!SectionComponent) return <PageLoading />;

  if (def.scope === 'matter' satisfies SettingsScope) {
    const matterId = readCurrentMatterId();
    if (!matterId) {
      return (
        <>
          {breadcrumb}
          <div className="p-6">
        <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <p className="text-sm font-medium">No matter selected</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Matter settings live inside a matter. Open a matter first, then come back to this section.
          </p>
            <Link
              to={urls.matters()}
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              Choose a matter
            </Link>
          </div>
          </div>
        </>
      );
    }
    return (
      <>
        {breadcrumb}
        <div className="p-6">
          <SectionComponent matterId={matterId} />
        </div>
      </>
    );
  }

  return (
    <>
      {breadcrumb}
      <div className="p-6">
        <SectionComponent />
      </div>
    </>
  );
}
