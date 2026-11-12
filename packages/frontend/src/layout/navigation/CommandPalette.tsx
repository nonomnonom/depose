import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@depose/ui/components/command';
import { Moon, Sun } from '@coolicons/react';

import { useTheme } from '~/layout/ThemeProvider';
import { useSession, useSignOut } from '~/lib/auth/session';
import { useClientConfig } from '~/lib/config/client-config';

import {
  dataGroups,
  matterTabs,
  settingsGroups,
  workspaceNav,
  type NavEntry,
} from './navigationLogic';

interface CommandPaletteValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CommandPaletteContext = createContext<CommandPaletteValue | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }): ReactNode {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return <CommandPaletteContext.Provider value={{ open, setOpen }}>{children}</CommandPaletteContext.Provider>;
}

export function useCommandPalette(): CommandPaletteValue {
  const value = useContext(CommandPaletteContext);
  if (!value) throw new Error('useCommandPalette must be used inside CommandPaletteProvider');
  return value;
}

interface PaletteGroup {
  label: string;
  items: NavEntry[];
}

/** Global command palette, mounted by the shell (PostHog AuthenticatedShell). */
export function CommandPalette(): ReactNode {
  const { open, setOpen } = useCommandPalette();
  const navigate = useNavigate();
  const { matterId } = useParams();
  const config = useClientConfig();
  const { can } = useSession();
  const { setTheme, resolvedTheme } = useTheme();
  const signOut = useSignOut();

  const groups = useMemo<PaletteGroup[]>(() => {
    const result: PaletteGroup[] = [];

    if (matterId) {
      const sections: NavEntry[] = [...matterTabs(matterId)];
      for (const group of dataGroups(matterId, can)) sections.push(...group.entries);
      result.push({ label: 'This matter', items: sections });
    }

    const settings: NavEntry[] = settingsGroups(can).flatMap((group) => group.entries);
    result.push({ label: 'Workspace', items: workspaceNav() });
    result.push({ label: 'Settings', items: settings });
    return result.filter((group) => group.items.length > 0);
  }, [can, matterId]);

  const run = (action: () => void): void => {
    setOpen(false);
    action();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Commands" description="Search pages or run an action">
      <Command>
        <CommandInput placeholder="Search pages..." autoFocus />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={`${group.label}-${item.id}`}
                    value={`${group.label} ${item.label}`}
                    onSelect={() => run(() => navigate(item.href))}
                  >
                    {Icon ? <Icon className="size-4" /> : null}
                    <span>{item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Instance">
            <CommandItem value="hostname" disabled>
              <span className="truncate text-xs text-muted-foreground">
                {config.firmName} · {config.hostname}
              </span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Appearance">
            <CommandItem
              value="light theme"
              onSelect={() => run(() => setTheme('light'))}
              data-checked={resolvedTheme === 'light'}
            >
              <Sun className="size-4" />
              <span>Light theme</span>
            </CommandItem>
            <CommandItem
              value="dark theme"
              onSelect={() => run(() => setTheme('dark'))}
              data-checked={resolvedTheme === 'dark'}
            >
              <Moon className="size-4" />
              <span>Dark theme</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Account">
            <CommandItem value="sign out" onSelect={() => run(() => signOut.mutate())}>
              <span>Sign out</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
