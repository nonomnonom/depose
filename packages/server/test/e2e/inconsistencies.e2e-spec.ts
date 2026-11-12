import { afterAll, beforeAll, describe, it } from '@jest/globals';
import assert from '../support/utils/jest-assert.js';
import type { E2EApp } from '../support/app/create-test-app.js';
import type { FakeModelServer } from '../support/fakes/model-server.fake.js';
import { request } from '../support/http.js';

interface MatterFixture {
  cookie: string;
  host: string;
  firmId: string;
  matterId: string;
  userId: string;
}

async function seedMatter(label: string): Promise<MatterFixture> {
  const { signUpUser, createFirmWithDomain, createMatter } = await import(
    '../support/auth/auth.helper.js'
  );
  const user = await signUpUser(e2e.baseUrl, { name: `${label} user` });
  const firm = await createFirmWithDomain({
    ownerId: user.userId,
    hostname: `${label}.depose.test`,
  });
  const matter = await createMatter({ firmId: firm.firmId, createdBy: user.userId });

  return {
    cookie: user.cookie,
    host: firm.hostname,
    firmId: firm.firmId,
    matterId: matter.matterId,
    userId: user.userId,
  };
}

let e2e: E2EApp;
let fake: FakeModelServer;

async function seedFact(
  fixture: MatterFixture,
  input: { text: string; entity: string; factType?: string },
): Promise<string> {
  const { db } = await import('../../src/infrastructure/database/database.client.js');
  const { facts } = await import('../../src/infrastructure/database/schema/index.js');

  const [row] = await db
    .insert(facts)
    .values({
      firmId: fixture.firmId,
      matterId: fixture.matterId,
      text: input.text,
      normalizedText: input.text.toLowerCase(),
      factType: input.factType ?? 'event',
      entityLabel: input.entity,
      status: 'confirmed',
      origin: 'manual',
    })
    .returning();
  return row.id;
}

describe('Contradiction detector', () => {
  beforeAll(async () => {
    const { startFakeModelServer } = await import('../support/fakes/model-server.fake.js');
    const { createE2EApp } = await import('../support/app/create-test-app.js');
    fake = await startFakeModelServer();
    e2e = await createE2EApp({
      DECISION_PROVIDER: 'openai-compatible',
      DECISION_BASE_URL: `${fake.url}/decisions`,
    });
  });

  afterAll(async () => {
    await e2e?.close();
    await fake?.close();
  });

  it('persists a confirmed pair with its two fact ids and amount severity', async () => {
    const fixture = await seedMatter('detect');
    const firstFact = await seedFact(fixture, {
      text: 'Acme agreed to pay USD 250,000 for the shares.',
      entity: 'Acme',
    });
    const secondFact = await seedFact(fixture, {
      text: 'Acme agreed to pay USD 150,000 for the shares.',
      entity: 'Acme',
    });

    fake.onDecision(() => ({
      verdict: { choice: 'contradiction' },
      dimension: { choice: 'amount' },
    }));

    const response = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/inconsistencies/detect`,
      { cookie: fixture.cookie, host: fixture.host, body: {} },
    );

    assert.equal(response.status, 201, response.text);
    const body = response.json<{
      detected: number;
      evaluated: number;
      items: {
        id: string;
        kind: string;
        severity: string;
        status: string;
        confidence: number;
        detectedBy: string;
      }[];
    }>();

    assert.equal(body.detected, 1);
    assert.equal(body.evaluated, 1);
    assert.equal(body.items[0].kind, 'amount');
    assert.equal(body.items[0].severity, 'critical');
    assert.equal(body.items[0].status, 'candidate');
    assert.equal(body.items[0].detectedBy, 'contradiction-detector');

    const { db } = await import('../../src/infrastructure/database/database.client.js');
    const { contradictionFacts, contradictions } = await import(
      '../../src/infrastructure/database/schema/index.js'
    );
    const { eq } = await import('drizzle-orm');

    const [stored] = await db
      .select()
      .from(contradictions)
      .where(eq(contradictions.id, body.items[0].id))
      .limit(1);
    assert.ok(stored, 'contradiction row exists');
    assert.match(stored.summary, /Acme agreed to pay/);

    const links = await db
      .select({ factId: contradictionFacts.factId, role: contradictionFacts.role })
      .from(contradictionFacts)
      .where(eq(contradictionFacts.contradictionId, stored.id));

    assert.equal(links.length, 2);
    assert.deepEqual(
      links.map((link) => link.factId).sort(),
      [firstFact, secondFact].sort(),
    );
    assert.deepEqual(links.map((link) => link.role).sort(), ['conflicting', 'source']);

    /* The listing the UI reads is now backed by real rows. */
    const listed = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/inconsistencies`,
      { cookie: fixture.cookie, host: fixture.host },
    );
    assert.equal(listed.status, 200);
    assert.equal(listed.json<{ items: unknown[] }>().items.length, 1);
  });

  it('does not write the same pair twice', async () => {
    const fixture = await seedMatter('dedup');
    await seedFact(fixture, { text: 'Beta paid the invoice on 1 May.', entity: 'Beta' });
    await seedFact(fixture, { text: 'Beta paid the invoice on 9 May.', entity: 'Beta' });

    fake.onDecision(() => ({
      verdict: { choice: 'contradiction' },
      dimension: { choice: 'date' },
    }));

    const first = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/inconsistencies/detect`,
      { cookie: fixture.cookie, host: fixture.host, body: {} },
    );
    assert.equal(first.status, 201, first.text);
    assert.equal(first.json<{ detected: number }>().detected, 1);

    const callsAfterFirst = fake.decisionCalls.length;

    const second = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/inconsistencies/detect`,
      { cookie: fixture.cookie, host: fixture.host, body: {} },
    );

    assert.equal(second.status, 201, second.text);
    const body = second.json<{ detected: number; skipped: number }>();
    assert.equal(body.detected, 0);
    assert.ok(body.skipped >= 1);
    assert.equal(
      fake.decisionCalls.length,
      callsAfterFirst,
      'a known pair is skipped before spending a model call',
    );

    const { db } = await import('../../src/infrastructure/database/database.client.js');
    const { contradictions } = await import('../../src/infrastructure/database/schema/index.js');
    const { eq } = await import('drizzle-orm');
    const rows = await db
      .select()
      .from(contradictions)
      .where(eq(contradictions.matterId, fixture.matterId));
    assert.equal(rows.length, 1);
  });

  it('stores nothing when the decision route says the facts are consistent', async () => {
    const fixture = await seedMatter('consistent');
    await seedFact(fixture, { text: 'Gamma shipped the goods.', entity: 'Gamma' });
    await seedFact(fixture, { text: 'Gamma shipped the goods late.', entity: 'Gamma' });

    fake.onDecision(() => ({
      verdict: { choice: 'consistent' },
      dimension: { choice: 'statement' },
    }));

    const response = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/inconsistencies/detect`,
      { cookie: fixture.cookie, host: fixture.host, body: {} },
    );

    assert.equal(response.status, 201, response.text);
    const body = response.json<{ detected: number; evaluated: number; skipped: number }>();
    assert.equal(body.evaluated, 1);
    assert.equal(body.detected, 0);
    assert.equal(body.skipped, 1);
  });

  it('maps statement conflicts to minor severity', async () => {
    const fixture = await seedMatter('statement');
    await seedFact(fixture, { text: 'Delta denies receiving the notice.', entity: 'Delta' });
    await seedFact(fixture, { text: 'Delta admits receiving the notice.', entity: 'Delta' });

    fake.onDecision(() => ({
      verdict: { choice: 'contradiction' },
      dimension: { choice: 'statement' },
    }));

    const response = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/inconsistencies/detect`,
      { cookie: fixture.cookie, host: fixture.host, body: {} },
    );

    assert.equal(response.status, 201, response.text);
    const item = response.json<{ items: { kind: string; severity: string }[] }>().items[0];
    assert.equal(item.kind, 'statement');
    assert.equal(item.severity, 'minor');
  });
});
