export type MatterStatus = 'active' | 'closed' | 'archived';

export interface Matter {
  id: string;
  name: string;
  matterNumber: string | null;
  type: string;
  status: MatterStatus;
  openedDate: string | null;
}

export interface FirmDomain {
  id: string;
  hostname: string;
  domainType: 'subdomain' | 'custom';
  isPrimary: boolean;
  status: string;
  sslStatus: string;
}