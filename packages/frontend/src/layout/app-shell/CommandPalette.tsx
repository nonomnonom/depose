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
import { firmNavGroups, matterSections } from '~/layout/app-shell/navigation';

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

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteValue {
  const value = useContext(CommandPaletteContext);
  if (!value) throw new Error('useCommandPalette must be used inside CommandPaletteProvider');
  return value;
}

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const navigate = useNavigate();
  const config = useClientConfig();
  const { can, me } = useSession();
  const { setTheme, resolvedTheme } = useTheme();
  const signOut = useSignOut();
  const matterMatch = useMatch('/matters/:matterId/*');
  const matterId = matterMatch?.params.matterId;

  const groups = useMemo(() => {
    const firmGroups = firmNavGroups
      .map((group) => ({
        label: group.label,
        items: group.items
          .filter((item) => {
            if (item.permission && !can(item.permission)) return false;
            if (item.firmOnly && !me?.firm) return false;
            return true;
          })
          .map((item) => ({ href: item.href, label: item.label, icon: item.icon })),
      }))
      .filter((group) => group.items.length > 0);

    if (!matterId) return firmGroups;

    const sections = matterSections(matterId)
      .filter((section) => !section.permission || can(section.permission))
      .map((section) => ({
        href: section.children?.[0]?.href ?? section.href,
        label: section.label,
        icon: null,
      }));

    return [{ label: 'This matter', items: sections }, ...firmGroups];
  }, [can, me?.firm, matterId]);

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
