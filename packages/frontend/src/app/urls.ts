export const urls = {
  login: '/login',
  signup: '/signup',
  setup: '/setup',
  invitations: (token: string) => `/invitations/${token}`,

  matters: '/matters',
  matter: (matterId: string) => `/matters/${matterId}`,
  matterSummary: (matterId: string) => `/matters/${matterId}/summary`,
  matterData: (matterId: string) => `/matters/${matterId}/data`,
  matterDataFacts: (matterId: string) => `/matters/${matterId}/data/facts`,
  matterDataChronologies: (matterId: string) => `/matters/${matterId}/data/chronologies`,
  matterDataInconsistencies: (matterId: string) => `/matters/${matterId}/data/inconsistencies`,
  matterDataReports: (matterId: string) => `/matters/${matterId}/data/reports`,
  matterDataEntities: (matterId: string) => `/matters/${matterId}/data/entities`,
  matterDataDocuments: (matterId: string) => `/matters/${matterId}/data/documents`,
  matterDataDocument: (matterId: string, documentId: string) =>
    `/matters/${matterId}/data/documents/${documentId}`,
  matterDataSubsets: (matterId: string) => `/matters/${matterId}/data/subsets`,
  matterDataSubset: (matterId: string, subsetId: string) =>
    `/matters/${matterId}/data/subsets/${subsetId}`,
  matterDataSearch: (matterId: string) => `/matters/${matterId}/data/search`,

  matterKim: (matterId: string) => `/matters/${matterId}/kim`,
  matterRealtime: (matterId: string) => `/matters/${matterId}/realtime`,
  matterSettings: (matterId: string) => `/matters/${matterId}/settings`,

  settings: {
    firm: '/settings/firm',
    members: '/settings/firm/members',
    domains: '/settings/firm/domains',
    ai: '/settings/firm/ai',
    integrations: '/settings/firm/integrations/mcp',
    profile: '/settings/user/profile',
    security: '/settings/user/security',
    notifications: '/settings/user/notifications',
    appearance: '/settings/user/appearance',
    myAi: '/settings/user/ai',
  },
  help: (slug?: string) => (slug ? `/help/${slug}` : '/help'),
  notifications: '/notifications',
};


