import { Link, Outlet, useLocation } from 'react-router-dom';
import { Card } from '@depose/ui/components/card';
import { Separator } from '@depose/ui/components/separator';
import { cn } from 'cn';
import { useSession } from '~/lib/auth/session';
import { PageHeader } from '~/layout/PageHeader';

const SETTINGS_NAV = [
  { href: '/settings/firm', label: 'Firm', permission: 'firm.read' },
  { href: '/settings/firm/domains', label: 'Domain', permission: 'firm.read' },
  { href: '/settings/profile', label: 'Profil', permission: undefined },
];

export function SettingsLayout() {
  const location = useLocation();
  const { can } = useSession();

  const items = SETTINGS_NAV.filter((item) => !item.permission || can(item.permission));

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Pengaturan"
        description="Kelola firm, domain, dan akun Anda."
      />
      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="flex gap-1 lg:w-56 lg:shrink-0 lg:flex-col" aria-label="Bagian pengaturan">
          {items.map((item) => {
            const active =
              location.pathname === item.href ||
              location.pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Separator orientation="vertical" className="hidden lg:block" />
        <Card className="flex-1 p-5 sm:p-6">
          <Outlet />
        </Card>
      </div>
    </section>
  );
}
