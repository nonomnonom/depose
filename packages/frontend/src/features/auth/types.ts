export type FirmRole = 'admin' | 'lawyer' | 'paralegal' | 'viewer' | 'guest';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

export interface Firm {
  id: string;
  name: string;
  slug: string;
  primaryLanguage: string;
  jurisdiction: string;
  defaultTimezone: string;
  settings: Record<string, unknown>;
  role?: FirmRole;
  memberId?: string;
}

export interface TenantInfo {
  hostname: string;
  firm: { name: string; slug: string } | null;
  domainType: 'subdomain' | 'custom' | null;
  isPrimary: boolean;
  isBootstrapHost: boolean;
  requiresSetup: boolean;
  auth: {
    allowSelfSignup: boolean;
    requireAdminApproval: boolean;
    ssoEnabled: boolean;
    forceSso: boolean;
    requireEmailVerification: boolean;
    mailConfigured: boolean;
  };
}

export interface Me {
  user: { id: string; email: string; name: string };
  firm: Firm | null;
  tenant: {
    hostname: string;
    domainType: 'subdomain' | 'custom' | null;
    isPrimary: boolean;
    isBootstrapHost: boolean;
  } | null;
  setupRequired: boolean;
  auth: {
    allowSelfSignup: boolean;
    forceSso: boolean;
    ssoEnabled: boolean;
    requireEmailVerification: boolean;
  };
}
