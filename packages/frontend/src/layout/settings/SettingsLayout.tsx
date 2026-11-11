import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Input } from '@depose/ui/components/input';
import { Separator } from '@depose/ui/components/separator';
import { cn } from '@depose/ui/lib/utils';
import { useSession } from '~/lib/auth/session';
import { PageHeader } from '~/layout/PageHeader';

interface SettingsSection {
  href: string;
  label: string;
  permission?: string;
}

interface SettingsGroup {
  label: string;
  items: SettingsSection[];
}

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    label: 'Firm',
    items: [
      { href: '/settings/firm', label: 'General', permission: 'firm.read' },
      { href: '/settings/firm/members', label: 'Members', permission: 'firm.member.manage' },
      { href: '/settings/firm/domains', label: 'Domains', permission: 'firm.read' },
      { href: '/settings/firm/ai', label: 'AI providers', permission: 'firm.update' },
      { href: '/settings/firm/integrations/mcp', label: 'Integrations', permission: 'firm.mcp.manage' },
    ],
  },
  {
    label: 'User',
    items: [
      { href: '/settings/user/profile', label: 'Profile' },
      { href: '/settings/user/security', label: 'Security' },
      { href: '/settings/user/notifications', label: 'Notifications' },
      { href: '/settings/user/appearance', label: 'Appearance' },
      { href: '/settings/user/ai', label: 'AI' },
    ],
  },
];

export function SettingsLayout() {
  const location = useLocation();
  const { can } = useSession();
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return SETTINGS_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.permission && !can(item.permission)) return false;
        if (!needle) return true;
        return (
          item.label.toLowerCase().includes(needle) ||
          group.label.toLowerCase().includes(needle)
        );
      }),
    })).filter((group) => group.items.length > 0);
  }, [can, query]);

  const totalSections = SETTINGS_GROUPS.reduce((count, group) => count + group.items.length, 0);

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Manage your firm, account, and working preferences." />

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="flex flex-col gap-4 lg:w-56 lg:shrink-0" aria-label="Bagian settings">
          {totalSections > 8 ? (
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search settings..."
              aria-label="Search settings"
            />
          ) : null}

          {groups.map((group) => (
            <details key={group.label} open={query.trim() ? true : undefined} className="group">
              <summary className="cursor-pointer list-none px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground marker:content-none">
                {group.label}
              </summary>
              <div className="mt-1 flex flex-col gap-1">
              {group.items.map((item) => {
                const active =
                  location.pathname === item.href ||
                  location.pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
              </div>
            </details>
          ))}

          {groups.length === 0 ? (
            <p className="px-2 text-sm text-muted-foreground">No matching sections.</p>
          ) : null}
        </nav>

        <Separator orientation="vertical" className="hidden lg:block" />

        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </section>
  );
}
