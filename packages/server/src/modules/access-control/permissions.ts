import type { FirmRole, MatterAccess } from '../../infrastructure/database/schema/enums.js';

/** Canonical actions from spec 08. */
export type Action =
  | 'firm.read'
  | 'firm.update'
  | 'firm.delete'
  | 'firm.member.manage'
  | 'firm.invitation.manage'
  | 'firm.sso.manage'
  | 'firm.api_key.manage'
  | 'firm.mcp.manage'
  | 'firm.audit.read'
  | 'firm.license.read'
  | 'matter.read'
  | 'matter.create'
  | 'matter.update'
  | 'matter.close'
  | 'matter.reopen'
  | 'matter.archive'
  | 'matter.delete'
  | 'matter.member.manage'
  | 'matter.share.manage'
  | 'document.read'
  | 'document.upload'
  | 'document.delete'
  | 'document.reprocess'
  | 'document.download'
  | 'document.privileged.read'
  | 'transcript.read'
  | 'transcript.edit'
  | 'fact.read'
  | 'fact.create'
  | 'fact.update'
  | 'fact.confirm'
  | 'fact.reject'
  | 'fact.merge'
  | 'fact.split'
  | 'fact.delete'
  | 'fact.relevance.update'
  | 'subset.read'
  | 'subset.create'
  | 'subset.update'
  | 'subset.delete'
  | 'subset.manage_documents'
  | 'issue.read'
  | 'issue.create'
  | 'issue.update'
  | 'issue.delete'
  | 'theme.read'
  | 'theme.update'
  | 'summary.read'
  | 'summary.generate'
  | 'event.read'
  | 'event.create'
  | 'event.update'
  | 'event.confirm'
  | 'event.reject'
  | 'intelligence.read'
  | 'intelligence.review'
  | 'intelligence.detect'
  | 'ai.ask'
  | 'ai.thread.manage'
  | 'ai.tool.create_output'
  | 'realtime.start'
  | 'realtime.send'
  | 'realtime.review'
  | 'realtime.end'
  | 'output.read'
  | 'output.create'
  | 'output.update'
  | 'output.finalize'
  | 'output.export'
  | 'output.delete'
  | 'search.read'
  | 'search.saved_view.manage'
  | 'api_key.read'
  | 'mcp.invoke';

const ADMIN_ONLY: Action[] = [
  'firm.update',
  'firm.delete',
  'firm.member.manage',
  'firm.invitation.manage',
  'firm.sso.manage',
  'firm.api_key.manage',
  'firm.mcp.manage',
  'firm.audit.read',
  'api_key.read',
];

const LAWYER_ACTIONS: Action[] = [
  'firm.read',
  'firm.license.read',
  'matter.read',
  'matter.create',
  'matter.update',
  'matter.close',
  'matter.reopen',
  'matter.archive',
  'matter.member.manage',
  'matter.share.manage',
  'document.read',
  'document.upload',
  'document.delete',
  'document.reprocess',
  'document.download',
  'document.privileged.read',
  'transcript.read',
  'transcript.edit',
  'fact.read',
  'fact.create',
  'fact.update',
  'fact.confirm',
  'fact.reject',
  'fact.merge',
  'fact.split',
  'fact.delete',
  'fact.relevance.update',
  'subset.read',
  'subset.create',
  'subset.update',
  'subset.delete',
  'subset.manage_documents',
  'issue.read',
  'issue.create',
  'issue.update',
  'issue.delete',
  'theme.read',
  'theme.update',
  'summary.read',
  'summary.generate',
  'event.read',
  'event.create',
  'event.update',
  'event.confirm',
  'event.reject',
  'intelligence.read',
  'intelligence.review',
  'intelligence.detect',
  'ai.ask',
  'ai.thread.manage',
  'ai.tool.create_output',
  'realtime.start',
  'realtime.send',
  'realtime.review',
  'realtime.end',
  'output.read',
  'output.create',
  'output.update',
  'output.finalize',
  'output.export',
  'output.delete',
  'search.read',
  'search.saved_view.manage',
  'mcp.invoke',
];

const PARALEGAL_ACTIONS: Action[] = [
  'firm.read',
  'firm.license.read',
  'matter.read',
  'document.read',
  'document.upload',
  'document.reprocess',
  'document.download',
  'transcript.read',
  'fact.read',
  'fact.create',
  'fact.update',
  'fact.relevance.update',
  'subset.read',
  'subset.create',
  'subset.update',
  'subset.delete',
  'subset.manage_documents',
  'issue.read',
  'theme.read',
  'theme.update',
  'summary.read',
  'summary.generate',
  'event.read',
  'event.create',
  'event.update',
  'intelligence.read',
  'intelligence.detect',
  'ai.ask',
  'ai.thread.manage',
  'realtime.send',
  'realtime.end',
  'output.read',
  'output.create',
  'output.update',
  'search.read',
  'search.saved_view.manage',
  'mcp.invoke',
];

const VIEWER_ACTIONS: Action[] = [
  'firm.read',
  'firm.license.read',
  'matter.read',
  'document.read',
  'transcript.read',
  'fact.read',
  'subset.read',
  'issue.read',
  'theme.read',
  'summary.read',
  'event.read',
  'intelligence.read',
  'ai.ask',
  'ai.thread.manage',
  'output.read',
  'search.read',
  'search.saved_view.manage',
];

const MATRIX: Record<FirmRole, Set<Action>> = {
  admin: new Set<Action>([
    ...ADMIN_ONLY,
    ...LAWYER_ACTIONS,
    'matter.delete',
    'api_key.read',
  ]),
  lawyer: new Set(LAWYER_ACTIONS),
  paralegal: new Set(PARALEGAL_ACTIONS),
  viewer: new Set(VIEWER_ACTIONS),
  guest: new Set<Action>(),
};

/** Minimum matter access required per action (admin always has full). */
const MIN_MATTER_ACCESS: Partial<Record<Action, MatterAccess>> = {
  'matter.read': 'viewer',
  'document.read': 'viewer',
  'document.download': 'viewer',
  'transcript.read': 'viewer',
  'fact.read': 'viewer',
  'subset.read': 'viewer',
  'issue.read': 'viewer',
  'theme.read': 'viewer',
  'summary.read': 'viewer',
  'event.read': 'viewer',
  'intelligence.read': 'viewer',
  'ai.ask': 'viewer',
  'ai.thread.manage': 'viewer',
  'output.read': 'viewer',
  'search.read': 'viewer',
  'search.saved_view.manage': 'viewer',
  'document.upload': 'contributor',
  'document.reprocess': 'contributor',
  'fact.create': 'contributor',
  'fact.update': 'contributor',
  'fact.relevance.update': 'contributor',
  'subset.create': 'contributor',
  'subset.update': 'contributor',
  'subset.delete': 'contributor',
  'subset.manage_documents': 'contributor',
  'summary.generate': 'contributor',
  'event.create': 'contributor',
  'event.update': 'contributor',
  'output.create': 'contributor',
  'output.update': 'contributor',
  'realtime.send': 'contributor',
  'realtime.end': 'contributor',
  'matter.update': 'full',
  'matter.close': 'full',
  'matter.reopen': 'full',
  'matter.archive': 'full',
  'matter.member.manage': 'full',
  'matter.share.manage': 'full',
  'document.delete': 'full',
  'fact.confirm': 'full',
  'fact.reject': 'full',
  'fact.merge': 'full',
  'fact.split': 'full',
  'fact.delete': 'full',
  'intelligence.review': 'full',
  'issue.create': 'full',
  'issue.update': 'full',
  'issue.delete': 'full',
  'theme.update': 'full',
  'output.finalize': 'full',
  'output.export': 'full',
  'output.delete': 'full',
  'realtime.start': 'full',
  'realtime.review': 'full',
};

const ACCESS_RANK: Record<MatterAccess, number> = {
  guest: 0,
  viewer: 1,
  contributor: 2,
  full: 3,
};

export function roleAllows(role: FirmRole, action: Action): boolean {
  return MATRIX[role].has(action);
}

export function requiredMatterAccess(action: Action): MatterAccess | undefined {
  return MIN_MATTER_ACCESS[action];
}

export function matterAccessSatisfies(
  actual: MatterAccess | null,
  required: MatterAccess | undefined,
): boolean {
  if (!required) return true;
  if (!actual) return false;
  return ACCESS_RANK[actual] >= ACCESS_RANK[required];
}

export function actionsForRole(role: FirmRole): Action[] {
  return [...MATRIX[role]];
}
