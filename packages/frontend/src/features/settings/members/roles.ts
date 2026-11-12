import type { FirmRole } from './types';

export const ROLE_OPTIONS: FirmRole[] = ['admin', 'lawyer', 'paralegal', 'viewer', 'guest'];

export const ROLE_LABELS: Record<FirmRole, string> = {
  admin: 'Admin',
  lawyer: 'Lawyer',
  paralegal: 'Paralegal',
  viewer: 'Viewer',
  guest: 'Guest',
};

export const ROLE_DESCRIPTIONS: Record<FirmRole, string> = {
  admin: 'Full control, including members, settings, and every matter.',
  lawyer: 'Runs matters end to end, including review and outputs.',
  paralegal: 'Uploads evidence and drafts facts and timelines.',
  viewer: 'Read-only access to matters shared with them.',
  guest: 'Limited external access to selected matters.',
};
