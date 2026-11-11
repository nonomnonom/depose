import { Outlet } from 'react-router-dom';
import {
  SidebarInset,
  SidebarProvider,
} from '@depose/ui/components/sidebar';
import { AppSidebar } from '~/layout/AppSidebar';
import { AppTopbar } from '~/layout/AppTopbar';
import { CommandPalette, CommandPaletteProvider } from '~/layout/CommandPalette';
import { OfflineBanner } from '~/layout/OfflineBanner';

export function AppLayout() {
  return (
    <CommandPaletteProvider>
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <SidebarInset>
          <AppTopbar />
          <OfflineBanner />
          <main className="flex flex-1 flex-col px-4 py-6 md:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
      <CommandPalette />
    </CommandPaletteProvider>
  );
}
