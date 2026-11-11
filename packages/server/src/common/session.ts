import { ForbiddenException } from '@nestjs/common';

export interface AuthenticatedSession {
  user: { id: string; email?: string };
  session: { id: string; activeOrganizationId?: string | null };
}

export function getOrganizationId(session: AuthenticatedSession): string {
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    throw new ForbiddenException(
      'No active organization. Select or create an organization to continue.',
    );
  }
  return organizationId;
}

export function getUserId(session: AuthenticatedSession): string {
  return session.user.id;
}
