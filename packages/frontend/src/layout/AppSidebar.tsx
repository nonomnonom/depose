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
import { isNavItemActive, navGroups } from '~/layout/navigation';

export function AppSidebar() {
  const location = useLocation();
  const config = useClientConfig();
  const { can, me } = useSession();

  const firmName = me?.firm?.name ?? config.firm?.name ?? 'Depose';
  const role = me?.firm?.role;

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
                <span className="truncate text-xs font-normal text-sidebar-foreground/60">
                  {role ? `Peran ${role}` : 'Depose'}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => {
          const items = group.items.filter((item) => {
            if (item.permission && !can(item.permission)) return false;
            if (item.firmOnly && !me?.firm) return false;
            return true;
          });
          if (items.length === 0) return null;

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isNavItemActive(item.href, location.pathname)}
                        tooltip={item.label}
                        render={<Link to={item.href} />}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="sm"
              tooltip={config.hostname}
              render={<button type="button" disabled />}
              className="cursor-default hover:bg-transparent"
            >
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
