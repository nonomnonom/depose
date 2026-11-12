import { afterAll, beforeAll, describe, it } from '@jest/globals';
import assert from './helpers/jest-assert.js';
import type { E2EApp } from './helpers/e2e-app.factory.js';
import { request } from './helpers/http.js';

interface Fixture {
  cookie: string;
  userId: string;
  firmId: string;
  hostname: string;
  matterId: string;
}

describe('Production hardening', () => {
  let e2e: E2EApp;
  let fixture: Fixture;

  beforeAll(async () => {
    const { createE2EApp } = await import('./helpers/e2e-app.factory.js');
    /* Production URL policy: private and plain-http outbound targets are denied. */
    e2e = await createE2EApp({ ALLOW_PRIVATE_OUTBOUND_URLS: 'false' });

    const { signUpUser, createFirmWithDomain, createMatter } = await import(
      './helpers/auth.test-utils.js'
    );
    const user = await signUpUser(e2e.baseUrl, { name: 'Hardening Admin' });
    const firm = await createFirmWithDomain({
      ownerId: user.userId,
      hostname: 'hardening.depose.test',
      role: 'admin',
    });
    const { matterId } = await createMatter({
      firmId: firm.firmId,
      createdBy: user.userId,
      name: 'Hardening matter',
    });

    fixture = {
      cookie: user.cookie,
      userId: user.userId,
      firmId: firm.firmId,
      hostname: firm.hostname,
      matterId,
    };
  });

  afterAll(async () => {
    await e2e?.close();
  });

  it('serves security headers and a dependency readiness probe', async () => {
    const health = await request(e2e.baseUrl, '/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(health.headers.get('x-frame-options'), 'DENY');
    assert.equal(health.headers.get('referrer-policy'), 'no-referrer');
    assert.ok(health.headers.get('x-request-id'));

    const ready = await request(e2e.baseUrl, '/api/health/ready');
    assert.equal(ready.status, 200);
    const body = ready.json<{ status: string; checks: Record<string, string> }>();
    assert.equal(body.status, 'ok');
    assert.deepEqual(body.checks, { database: 'ok', redis: 'ok' });
  });

  it('creates, authenticates, scopes, and revokes a firm API key', async () => {
    const created = await request(e2e.baseUrl, '/api/v1/api-keys', {
      cookie: fixture.cookie,
      host: fixture.hostname,
      body: { name: 'integration key', scopes: ['matter.read'] },
    });
    assert.equal(created.status, 201, created.text);
    const key = created.json<{ key: { id: string; rawKey: string } }>().key;
    assert.match(key.rawKey, /^dp_[A-Za-z0-9_-]{20,}$/);

    /* The raw key works as a bearer credential and sees the firm's matters. */
    const matters = await request(e2e.baseUrl, '/api/v1/matters', {
      host: fixture.hostname,
      headers: { authorization: `Bearer ${key.rawKey}` },
    });
    assert.equal(matters.status, 200, matters.text);
    const ids = matters.json<{ items: { id: string }[] }>().items.map((item) => item.id);
    assert.ok(ids.includes(fixture.matterId));

    /* A scope that was not granted is denied even though the role would allow it. */
    const documents = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/documents`,
      {
        host: fixture.hostname,
        headers: { authorization: `Bearer ${key.rawKey}` },
      },
    );
    assert.equal(documents.status, 403, documents.text);

    /* A key cannot mint or revoke other keys without the admin scope. */
    const manage = await request(e2e.baseUrl, '/api/v1/api-keys', {
      host: fixture.hostname,
      headers: { authorization: `Bearer ${key.rawKey}` },
      body: { name: 'escalated key' },
    });
    assert.equal(manage.status, 403, manage.text);

    const revoked = await request(e2e.baseUrl, `/api/v1/api-keys/${key.id}`, {
      cookie: fixture.cookie,
      host: fixture.hostname,
      method: 'DELETE',
    });
    assert.equal(revoked.status, 200, revoked.text);

    const afterRevoke = await request(e2e.baseUrl, '/api/v1/matters', {
      host: fixture.hostname,
      headers: { authorization: `Bearer ${key.rawKey}` },
    });
    assert.equal(afterRevoke.status, 401);
  });

  it('stores only a one-way digest of the API key', async () => {
    const { db } = await import('../src/infrastructure/database/database.client.js');
    const { apiKeys } = await import('../src/infrastructure/database/schema/index.js');
    const { eq } = await import('drizzle-orm');

    const created = await request(e2e.baseUrl, '/api/v1/api-keys', {
      cookie: fixture.cookie,
      host: fixture.hostname,
      body: { name: 'digest key', scopes: ['matter.read'] },
    });
    const key = created.json<{ key: { id: string; rawKey: string } }>().key;

    const [row] = await db.select().from(apiKeys).where(eq(apiKeys.id, key.id));
    assert.match(row.secretHash, /^[0-9a-f]{64}$/, 'secretHash must be a SHA-256 hex digest');
    assert.notEqual(row.secretHash, key.rawKey);
    assert.notEqual(row.secretHash, Buffer.from(key.rawKey).toString('base64'));
  });

  it('blocks unsafe webhook targets and delivers CRUD without a matter id mix-up', async () => {
    const privateTarget = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/webhooks`,
      {
        cookie: fixture.cookie,
        host: fixture.hostname,
        body: {
          url: 'https://127.0.0.1/hook',
          events: ['document.processed'],
        },
      },
    );
    assert.equal(privateTarget.status, 400, privateTarget.text);

    const plainHttp = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/webhooks`,
      {
        cookie: fixture.cookie,
        host: fixture.hostname,
        body: {
          url: 'http://example.com/hook',
          events: ['document.processed'],
        },
      },
    );
    assert.equal(plainHttp.status, 400, plainHttp.text);

    const created = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/webhooks`,
      {
        cookie: fixture.cookie,
        host: fixture.hostname,
        body: {
          url: 'https://93.184.216.34/depose-hook',
          events: ['document.processed'],
          secret: 'a-long-signing-secret-value',
        },
      },
    );
    assert.equal(created.status, 201, created.text);
    const webhook = created.json<{ webhook: { id: string; hasSecret: boolean } }>().webhook;
    assert.equal(webhook.hasSecret, true);

    const { db } = await import('../src/infrastructure/database/database.client.js');
    const { webhooks } = await import('../src/infrastructure/database/schema/index.js');
    const { eq } = await import('drizzle-orm');
    const [stored] = await db.select().from(webhooks).where(eq(webhooks.id, webhook.id));
    const secretCiphertext = stored.secretCiphertext ?? '';
    assert.ok(secretCiphertext.startsWith('v1.'), 'secret must be encrypted at rest');
    assert.ok(!secretCiphertext.includes('a-long-signing-secret-value'));

    const listed = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/webhooks`,
      { cookie: fixture.cookie, host: fixture.hostname },
    );
    assert.equal(listed.status, 200, listed.text);

    const deliveries = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/webhooks/${webhook.id}/deliveries`,
      { cookie: fixture.cookie, host: fixture.hostname },
    );
    assert.equal(deliveries.status, 200, deliveries.text);

    const removed = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/webhooks/${webhook.id}`,
      { cookie: fixture.cookie, host: fixture.hostname, method: 'DELETE' },
    );
    assert.equal(removed.status, 200, removed.text);
  });

  it('keeps issues, entities, relevance, and realtime inside their matter', async () => {
    const { db } = await import('../src/infrastructure/database/database.client.js');
    const schema = await import('../src/infrastructure/database/schema/index.js');
    const { createMatter } = await import('./helpers/auth.test-utils.js');

    const other = await createMatter({
      firmId: fixture.firmId,
      createdBy: fixture.userId,
      name: 'Other matter',
    });

    const [fact] = await db
      .insert(schema.facts)
      .values({
        firmId: fixture.firmId,
        matterId: other.matterId,
        text: 'A fact that belongs to the other matter',
        normalizedText: 'a fact that belongs to the other matter',
        status: 'confirmed',
        origin: 'manual',
      })
      .returning();
    const [entity] = await db
      .insert(schema.entities)
      .values({
        firmId: fixture.firmId,
        matterId: other.matterId,
        canonicalName: 'Other Matter Entity',
        normalizedName: 'other matter entity',
        type: 'organization',
      })
      .returning();

    const createIssue = (matterId: string, name: string) =>
      request(e2e.baseUrl, `/api/v1/matters/${matterId}/issues`, {
        cookie: fixture.cookie,
        host: fixture.hostname,
        body: { name },
      });

    const issueA = (await createIssue(fixture.matterId, 'Issue in A')).json<{
      issue: { id: string };
    }>().issue;
    const issueB = (await createIssue(other.matterId, 'Issue in B')).json<{
      issue: { id: string };
    }>().issue;

    /* Matter B cannot read, mutate, or list facts of matter A's issue. */
    const readAcross = await request(
      e2e.baseUrl,
      `/api/v1/matters/${other.matterId}/issues/${issueA.id}`,
      { cookie: fixture.cookie, host: fixture.hostname },
    );
    assert.equal(readAcross.status, 404, readAcross.text);

    const factsAcross = await request(
      e2e.baseUrl,
      `/api/v1/matters/${other.matterId}/issues/${issueA.id}/facts`,
      { cookie: fixture.cookie, host: fixture.hostname },
    );
    assert.equal(factsAcross.status, 404, factsAcross.text);

    const statusAcross = await request(
      e2e.baseUrl,
      `/api/v1/matters/${other.matterId}/issues/${issueA.id}/status`,
      {
        cookie: fixture.cookie,
        host: fixture.hostname,
        method: 'PATCH',
        body: { status: 'closed' },
      },
    );
    assert.equal(statusAcross.status, 404, statusAcross.text);

    /* Linking checks both ends: issue in B, fact in A, and vice versa. */
    const linkAcross = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/issues/${issueB.id}/facts/${fact.id}`,
      { cookie: fixture.cookie, host: fixture.hostname, method: 'POST' },
    );
    assert.equal(linkAcross.status, 404, linkAcross.text);

    const foreignFact = await db
      .insert(schema.facts)
      .values({
        firmId: fixture.firmId,
        matterId: fixture.matterId,
        text: 'A fact that belongs to the first matter',
        normalizedText: 'a fact that belongs to the first matter',
        status: 'confirmed',
        origin: 'manual',
      })
      .returning();
    const linkForeignFact = await request(
      e2e.baseUrl,
      `/api/v1/matters/${other.matterId}/issues/${issueB.id}/facts/${foreignFact[0].id}`,
      { cookie: fixture.cookie, host: fixture.hostname, method: 'POST' },
    );
    assert.equal(linkForeignFact.status, 400, linkForeignFact.text);

    const linkOwn = await request(
      e2e.baseUrl,
      `/api/v1/matters/${other.matterId}/issues/${issueB.id}/facts/${fact.id}`,
      { cookie: fixture.cookie, host: fixture.hostname, method: 'POST' },
    );
    assert.ok(linkOwn.status < 300, linkOwn.text);
    const ownFacts = await request(
      e2e.baseUrl,
      `/api/v1/matters/${other.matterId}/issues/${issueB.id}/facts`,
      { cookie: fixture.cookie, host: fixture.hostname },
    );
    assert.deepEqual(
      ownFacts.json<{ items: { factId: string }[] }>().items.map((item) => item.factId),
      [fact.id],
    );

    /* Entity aliases and relevance are authenticated against the matter. */
    const aliasAcross = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/entities/${entity.id}/aliases`,
      { cookie: fixture.cookie, host: fixture.hostname, body: { alias: 'Smuggled alias' } },
    );
    assert.equal(aliasAcross.status, 404, aliasAcross.text);

    const relevanceAcross = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/relevance`,
      {
        cookie: fixture.cookie,
        host: fixture.hostname,
        body: { factId: fact.id, scopeType: 'matter', scopeId: fixture.matterId, label: 'key' },
      },
    );
    assert.equal(relevanceAcross.status, 400, relevanceAcross.text);

    const [session] = await db
      .insert(schema.realtimeSessions)
      .values({
        firmId: fixture.firmId,
        matterId: other.matterId,
        createdBy: fixture.userId,
        status: 'active',
      })
      .returning();
    const sessionAcross = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/realtime/sessions/${session.id}`,
      { cookie: fixture.cookie, host: fixture.hostname },
    );
    assert.equal(sessionAcross.status, 404, sessionAcross.text);
  });

  it('paginates chronology without repeating a row', async () => {
    const { db } = await import('../src/infrastructure/database/database.client.js');
    const { facts } = await import('../src/infrastructure/database/schema/index.js');

    await db.insert(facts).values(
      ['2020-01-01', '2020-01-02', '2020-01-03'].map((dateStart) => ({
        firmId: fixture.firmId,
        matterId: fixture.matterId,
        text: `Event on ${dateStart}`,
        normalizedText: `event on ${dateStart}`,
        status: 'confirmed' as const,
        origin: 'manual' as const,
        dateStart,
      })),
    );

    const first = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/chronology?limit=2`,
      { cookie: fixture.cookie, host: fixture.hostname },
    );
    assert.equal(first.status, 200, first.text);
    const page = first.json<{ items: { id: string }[]; nextCursor: string | null }>();
    assert.equal(page.items.length, 2);
    assert.ok(page.nextCursor, 'first page must carry a cursor');

    const second = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/chronology?limit=2&cursor=${encodeURIComponent(
        page.nextCursor!,
      )}`,
      { cookie: fixture.cookie, host: fixture.hostname },
    );
    assert.equal(second.status, 200, second.text);
    const next = second.json<{ items: { id: string }[]; nextCursor: string | null }>();
    assert.equal(next.items.length, 1);
    assert.equal(next.nextCursor, null);

    const seen = new Set(page.items.map((item) => item.id));
    assert.ok(
      next.items.every((item) => !seen.has(item.id)),
      'pages must not overlap',
    );
  });
});
