import { randomUUID } from 'node:crypto';
import { db } from '../../../src/infrastructure/database/database.client.js';
import {
  firmDomains,
  firms,
  matters,
  member,
  messages,
  organization,
  threads,
} from '../../../src/infrastructure/database/schema/index.js';
import type { FirmRole } from '../../../src/infrastructure/database/schema/enums.js';
import { request } from '../http.js';

export interface TestUser {
  userId: string;
  email: string;
  password: string;
  name: string;
  cookie: string;
}

function cookieFrom(headers: Headers): string {
  const cookies = headers.getSetCookie();
  if (cookies.length === 0) return '';
  return cookies.map((value) => value.split(';')[0]).join('; ');
}

/**
 * Signs a user up through the real `/api/auth` handler, so the session cookie is
 * produced by the same code path production uses.
 */
export async function signUpUser(
  baseUrl: string,
  input: { email?: string; password?: string; name?: string } = {},
): Promise<TestUser> {
  const email = input.email ?? `user-${randomUUID()}@example.test`;
  const password = input.password ?? 'correct-horse-battery';
  const name = input.name ?? 'E2E User';

  const response = await request(baseUrl, '/api/auth/sign-up/email', {
    body: { email, password, name },
  });
  if (response.status !== 200) {
    throw new Error(`sign-up failed (${response.status}): ${response.text}`);
  }

  const payload = response.json<{ user?: { id?: string } }>();
  const cookie = cookieFrom(response.headers);
  if (!payload.user?.id || !cookie) {
    throw new Error(`sign-up returned no user or session cookie: ${response.text}`);
  }

  return { userId: payload.user.id, email, password, name, cookie };
}

export async function signInUser(
  baseUrl: string,
  email: string,
  password: string,
): Promise<string> {
  const response = await request(baseUrl, '/api/auth/sign-in/email', {
    body: { email, password },
  });
  if (response.status !== 200) {
    throw new Error(`sign-in failed (${response.status}): ${response.text}`);
  }
  const cookie = cookieFrom(response.headers);
  if (!cookie) throw new Error('sign-in returned no session cookie');
  return cookie;
}

export interface TestFirm {
  firmId: string;
  organizationId: string;
  hostname: string;
}

/**
 * Creates the better-auth organization, the firm row that mirrors it, and the
 * active domain the tenancy middleware resolves the request host through.
 */
export async function createFirmWithDomain(input: {
  ownerId: string;
  name?: string;
  hostname?: string;
  role?: FirmRole;
}): Promise<TestFirm> {
  const hostname = input.hostname ?? `firm-${randomUUID().slice(0, 8)}.depose.test`;
  const name = input.name ?? `Firm ${hostname.split('.')[0]}`;
  const organizationId = randomUUID();

  /* Better Auth's organization plugin needs a slug; tenancy never reads it. */
  await db.insert(organization).values({ id: organizationId, name, slug: organizationId });
  await db.insert(member).values({
    id: randomUUID(),
    organizationId,
    userId: input.ownerId,
    role: input.role ?? 'admin',
  });  const [firm] = await db
    .insert(firms).values({
      organizationId,
      name,
      slug: organizationId,
      jurisdiction: 'ID',
      ownerId: input.ownerId,
    }).returning();

  await db.insert(firmDomains).values({
    firmId: firm.id,
    hostname,
    domainType: 'subdomain',
    isPrimary: true,
    status: 'active',
    verifiedAt: new Date(),
  });

  return { firmId: firm.id, organizationId, hostname };
}

export async function addFirmMember(input: {
  firm: TestFirm;
  userId: string;
  role: FirmRole;
}): Promise<void> {
  await db.insert(member).values({
    id: randomUUID(),
    organizationId: input.firm.organizationId,
    userId: input.userId,
    role: input.role,
  });
}

export async function createMatter(input: {
  firmId: string;
  createdBy: string;
  name?: string;
}): Promise<{ matterId: string }> {
  const [matter] = await db
    .insert(matters)
    .values({
      firmId: input.firmId,
      name: input.name ?? 'E2E Matter',
      createdBy: input.createdBy,
    })
    .returning();
  return { matterId: matter.id };
}

/** Seeds a conversation so tenant isolation of threads/messages can be asserted. */
export async function createThreadWithMessage(input: {
  firmId: string;
  matterId: string;
  userId: string;
  content: string;
}): Promise<{ threadId: string; messageId: string }> {
  const [thread] = await db
    .insert(threads)
    .values({
      firmId: input.firmId,
      matterId: input.matterId,
      userId: input.userId,
      scope: 'matter',
      title: 'Seeded thread',
    })
    .returning();

  const [message] = await db
    .insert(messages)
    .values({
      firmId: input.firmId,
      matterId: input.matterId,
      threadId: thread.id,
      role: 'user',
      content: input.content,
    })
    .returning();

  return { threadId: thread.id, messageId: message.id };
}
