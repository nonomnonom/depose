import { afterAll, beforeAll, describe, it } from '@jest/globals';
import assert from '../support/utils/jest-assert.js';
import type { E2EApp } from '../support/app/create-test-app.js';
import { request } from '../support/http.js';

interface TenantFixture {
  cookie: string;
  userId: string;
  firmId: string;
  memberId: string;
  hostname: string;
  matterId: string;
}

describe('Tenancy and access isolation', () => {
  let e2e: E2EApp;
  let alpha: TenantFixture;
  let beta: TenantFixture;

  beforeAll(async () => {
    const { createE2EApp } = await import('../support/app/create-test-app.js');
    e2e = await createE2EApp();

    const { signUpUser, createFirmWithDomain, createMatter } = await import(
      '../support/auth/auth.helper.js'
    );
    const { db } = await import('../../src/infrastructure/database/database.client.js');
    const { member } = await import('../../src/infrastructure/database/schema/index.js');

    const build = async (label: string): Promise<TenantFixture> => {
      const user = await signUpUser(e2e.baseUrl, { name: `${label} user` });
      const firm = await createFirmWithDomain({
        ownerId: user.userId,
        hostname: `${label}.depose.test`,
      });
      const { matterId } = await createMatter({
        firmId: firm.firmId,
        createdBy: user.userId,
        name: `${label} matter`,
      });
      const memberships = await db.select().from(member);
      const membership = memberships.find(
        (row) => row.organizationId === firm.organizationId && row.userId === user.userId,
      );
      assert.ok(membership, 'membership row exists');

      return {
        cookie: user.cookie,
        userId: user.userId,
        firmId: firm.firmId,
        memberId: membership!.id,
        hostname: firm.hostname,
        matterId,
      };
    };

    alpha = await build('alpha');
    beta = await build('beta');
  });

  afterAll(async () => {
    await e2e?.close();
  });

  it('lists only the caller firm matters', async () => {
    const response = await request(e2e.baseUrl, '/api/v1/matters', {
      cookie: alpha.cookie,
      host: alpha.hostname,
    });

    assert.equal(response.status, 200);
    const body = response.json<{ items: { id: string }[] }>();
    const ids = body.items.map((item) => item.id);
    assert.ok(ids.includes(alpha.matterId));
    assert.ok(!ids.includes(beta.matterId), 'other tenant matter must not be listed');
  });

  it('hides another tenant matter behind 404', async () => {
    const response = await request(e2e.baseUrl, `/api/v1/matters/${beta.matterId}`, {
      cookie: alpha.cookie,
      host: alpha.hostname,
    });

    assert.equal(response.status, 404);
  });

  it('rejects a signed-in user who is not a member of the tenant', async () => {
    const response = await request(e2e.baseUrl, '/api/v1/matters', {
      cookie: alpha.cookie,
      host: beta.hostname,
    });

    assert.equal(response.status, 403);
  });

  it('rejects an unknown tenant host before any data access', async () => {
    const response = await request(e2e.baseUrl, '/api/v1/matters', {
      cookie: alpha.cookie,
      host: 'nobody.depose.test',
    });

    assert.equal(response.status, 404);
  });

  it('does not leak thread messages across firms (IDOR regression)', async () => {
    const { createThreadWithMessage } = await import('../support/auth/auth.helper.js');

    const thread = await createThreadWithMessage({
      firmId: alpha.firmId,
      matterId: alpha.matterId,
      userId: alpha.userId,
      content: 'alpha privileged note',
    });

    const { OutputsService } = await import('../../src/modules/outputs/outputs.service.js');
    const outputs = e2e.app.get(OutputsService);

    const outsider = {
      userId: beta.userId,
      email: 'beta@example.test',
      name: 'Beta',
      sessionId: 'session-beta',
      firmId: beta.firmId,
      role: 'admin' as const,
      memberId: beta.memberId,
    };

    await assert.rejects(
      () => outputs.listMessages(outsider, thread.threadId),
      (error: { status?: number; code?: string }) =>
        error.status === 404 || error.code === 'NOT_FOUND',
      'a foreign firm must not read the thread',
    );

    const insider = {
      userId: alpha.userId,
      email: 'alpha@example.test',
      name: 'Alpha',
      sessionId: 'session-alpha',
      firmId: alpha.firmId,
      role: 'admin' as const,
      memberId: alpha.memberId,
    };
    const result = await outputs.listMessages(insider, thread.threadId);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].content, 'alpha privileged note');
  });
});
