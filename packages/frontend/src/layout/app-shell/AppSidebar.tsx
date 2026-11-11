import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import { unwrapData } from '~/lib/api/client';
import { mattersControllerList } from '~/generated/endpoints';
import { queryKeys } from '~/lib/query/keys';
import { firmNavGroups, isNavItemActive } from '~/layout/app-shell/navigation';
import { OnboardingChecklist } from '~/scenes/onboarding/OnboardingChecklist';

export function AppSidebar() {
  const location = useLocation();
  const config = useClientConfig();
  const { can, me } = useSession();

  const firmName = me?.firm?.name ?? config.firmName;
  const role = me?.firm?.role;

  const mattersQuery = useQuery({
    queryKey: queryKeys.matters({ limit: 20 }),
    queryFn: async () => unwrapData(await mattersControllerList({ limit: 20 })),
    enabled: Boolean(me?.firm) && can('matter.read'),
    staleTime: 30_000,
  });
  const recentMatters = mattersQuery.data?.items.slice(0, 20) ?? [];

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
                  {role ? role : 'Depose'}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <OnboardingChecklist />

        {can('matter.read') ? (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Matters</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {recentMatters.map((matter) => (
                  <SidebarMenuItem key={matter.id}>
                    <SidebarMenuButton
                      isActive={location.pathname.startsWith(`/matters/${matter.id}`)}
                      tooltip={matter.name}
                      render={<Link to={`/matters/${matter.id}/overview`} />}
                    >
                      <span className="truncate">{matter.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {recentMatters.length === 0 && !mattersQuery.isPending ? (
                  <p className="px-2 py-1 text-xs text-sidebar-foreground/50">No matters yet.</p>
                ) : null}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location.pathname === '/matters'}
                    tooltip="All matters"
                    render={<Link to="/matters" />}
                  >
                    <span className="text-sidebar-foreground/70">All matters</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {firmNavGroups.map((group) => {
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
