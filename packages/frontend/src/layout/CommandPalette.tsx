import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { MoonIcon, SunIcon } from 'lucide-react';
import { useClientConfig } from '~/lib/config/client-config';
import { useSession, useSignOut } from '~/lib/auth/session';
import { useTheme } from '~/layout/ThemeProvider';
import { navGroups } from '~/layout/navigation';

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

  const groups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          label: group.label,
          items: group.items.filter((item) => {
            if (item.permission && !can(item.permission)) return false;
            if (item.firmOnly && !me?.firm) return false;
            return true;
          }),
        }))
        .filter((group) => group.items.length > 0),
    [can, me?.firm],
  );

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Perintah"
      description="Cari halaman atau jalankan aksi"
    >
      <Command>
        <CommandInput placeholder="Cari halaman..." autoFocus />
        <CommandList>
          <CommandEmpty>Tidak ada hasil.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${group.label} ${item.label}`}
                  onSelect={() => run(() => navigate(item.href))}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Instance">
            <CommandItem value="hostname" disabled>
              <span className="truncate text-xs text-muted-foreground">
                {config.firm?.name ?? 'Instance'} · {config.hostname}
              </span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Tampilan">
            <CommandItem
              value="tema terang"
              onSelect={() => run(() => setTheme('light'))}
              data-checked={resolvedTheme === 'light'}
            >
              <SunIcon className="size-4" />
              <span>Tema terang</span>
            </CommandItem>
            <CommandItem
              value="tema gelap"
              onSelect={() => run(() => setTheme('dark'))}
              data-checked={resolvedTheme === 'dark'}
            >
              <MoonIcon className="size-4" />
              <span>Tema gelap</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Akun">
            <CommandItem value="keluar" onSelect={() => run(() => signOut.mutate())}>
              <span>Keluar</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
