import { Link, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@depose/ui/components/sidebar';
import logoUrl from '~/assets/mascot/logo-favicon.png';
import { useClientConfig } from '~/lib/config/client-config';
import { useSession } from '~/lib/auth/session';
import { globalNavGroups } from '~/app/navigation';

export function AppSidebar() {
  const location = useLocation();
  const config = useClientConfig();
  const { can, me } = useSession();

  const firmName = me?.firm?.name ?? config.firmName;

  const groups = globalNavGroups
    .map((group) => ({
      ...group,
      entries: group.entries.filter((entry) => !entry.permission || can(entry.permission)),
    }))
    .filter((group) => group.entries.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={firmName}
              render={<Link to="/matters" />}
              className="gap-2.5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent">
                <img src={logoUrl} alt="" className="size-5" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                <span className="truncate text-sm font-semibold leading-tight">{firmName}</span>
                <span className="truncate text-xs font-normal text-sidebar-foreground/60">Depose</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.entries.map((entry) => (
                  <SidebarMenuItem key={entry.href}>
                    <SidebarMenuButton
                      isActive={location.pathname === entry.href || location.pathname.startsWith(`${entry.href}/`)}
                      tooltip={entry.label}
                      render={<Link to={entry.href} />}
                    >
                      {entry.icon ? <entry.icon /> : null}
                      <span>{entry.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" tooltip={config.hostname} render={<Link to="/matters" />}>
              <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span className="truncate text-xs text-sidebar-foreground/60">{config.hostname}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
