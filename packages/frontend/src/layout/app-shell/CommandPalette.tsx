import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
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
import { useClientConfig } from '~/lib/config/client-config';
import { useSession, useSignOut } from '~/lib/auth/session';
import { useTheme } from '~/layout/ThemeProvider';
import { globalNavGroups, matterWorkspaceNav, type NavEntry } from '~/app/navigation';

interface CommandPaletteValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CommandPaletteContext = createContext<CommandPaletteValue | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
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

interface CommandGroup {
  label: string;
  items: NavEntry[];
}

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const navigate = useNavigate();
  const config = useClientConfig();
  const { can } = useSession();
  const { setTheme, resolvedTheme } = useTheme();
  const signOut = useSignOut();
  const matterMatch = useMatch('/matters/:matterId/*');
  const matterId = matterMatch?.params.matterId;

  const groups = useMemo<CommandGroup[]>(() => {
    const firmGroups: CommandGroup[] = globalNavGroups
      .map((group) => ({
        label: group.label,
        items: group.entries.filter((entry) => !entry.permission || can(entry.permission)),
      }))
      .filter((group) => group.items.length > 0);

    if (!matterId) return firmGroups;

    const workspace = matterWorkspaceNav(matterId, can);
    const matterItems: NavEntry[] = [...workspace.tabs];
    for (const section of workspace.dataSections) {
      matterItems.push(section);
      for (const child of section.children ?? []) {
        matterItems.push(child);
      }
    }

    return [{ label: 'This matter', items: matterItems }, ...firmGroups];
  }, [can, matterId]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Commands"
      description="Search pages or run an action"
    >
      <Command>
        <CommandInput placeholder="Search pages..." autoFocus />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${group.label} ${item.label}`}
                  onSelect={() => run(() => navigate(item.href))}
                >
                  {item.icon ? <item.icon className="size-4" /> : null}
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Instance">
            <CommandItem value="hostname" disabled>
              <span className="truncate text-xs text-muted-foreground">
                {config.firmName} {config.hostname}
              </span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Appearance">
            <CommandItem value="light theme" onSelect={() => run(() => setTheme('light'))} data-checked={resolvedTheme === 'light'}>
              <Sun className="size-4" />
              <span>Light theme</span>
            </CommandItem>
            <CommandItem value="dark theme" onSelect={() => run(() => setTheme('dark'))} data-checked={resolvedTheme === 'dark'}>
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




