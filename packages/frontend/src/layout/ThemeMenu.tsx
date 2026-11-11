import { Button } from '@depose/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@depose/ui/components/dropdown-menu';
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useTheme, type Theme } from '~/layout/ThemeProvider';

const OPTIONS: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Terang', icon: SunIcon },
  { value: 'dark', label: 'Gelap', icon: MoonIcon },
  { value: 'system', label: 'Ikuti sistem', icon: MonitorIcon },
];

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const Current = theme === 'light' ? SunIcon : theme === 'dark' ? MoonIcon : MonitorIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Ubah tema" />}
      >
        <Current className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)}>
            <option.icon className="size-4" />
            <span>{option.label}</span>
            {theme === option.value ? <CheckIcon className="ml-auto size-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
