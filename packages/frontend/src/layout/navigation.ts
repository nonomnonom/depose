import {
  Building2,
  ListChecks,
  Scale,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
  firmOnly?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: 'Kerja',
    items: [
      { href: '/matters', label: 'Matter', icon: Scale, permission: 'matter.read', firmOnly: true },
      { href: '/onboarding', label: 'Onboarding', icon: ListChecks, firmOnly: true },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { href: '/settings/firm', label: 'Firm', icon: Building2, permission: 'firm.read' },
      { href: '/settings/profile', label: 'Profil', icon: UserRound },
    ],
  },
];

export function isNavItemActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const SETTINGS_SECTIONS: Record<string, string> = {
  '/settings/firm': 'Firm',
  '/settings/firm/domains': 'Domain',
  '/settings/profile': 'Profil',
};

export interface BreadcrumbEntry {
  label: string;
  href?: string;
}

export function breadcrumbsFor(pathname: string, firmName: string): BreadcrumbEntry[] {
  const root: BreadcrumbEntry = { label: firmName, href: '/matters' };

  if (pathname === '/onboarding') return [root, { label: 'Onboarding' }];

  const section = SETTINGS_SECTIONS[pathname];
  if (section) {
    const trail: BreadcrumbEntry[] = [root, { label: 'Pengaturan', href: '/settings/firm' }];
    if (pathname === '/settings/firm') return [...trail, { label: 'Firm' }];
    if (pathname.startsWith('/settings/firm/')) {
      return [...trail, { label: 'Firm', href: '/settings/firm' }, { label: section }];
    }
    return [...trail, { label: section }];
  }

  if (pathname === '/matters') return [root, { label: 'Matter' }];

  return [root];
}
