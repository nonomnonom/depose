import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { E2EApp } from './helpers/e2e-app.factory.js';
import type { FakeModelServer } from './helpers/fake-model-server.js';
import { request } from './helpers/http.js';

interface AiFixture {
  cookie: string;
  firmId: string;
  matterId: string;
  hostname: string;
}

describe('Dep AI evidence answer', () => {
  let e2e: E2EApp;
  let fake: FakeModelServer;
  let fixture: AiFixture;

  before(async () => {
    const { createE2EApp } = await import('./helpers/e2e-app.factory.js');
    const { startFakeModelServer } = await import('./helpers/fake-model-server.js');
    fake = await startFakeModelServer();
    e2e = await createE2EApp();
  });

  after(async () => {
    await fake?.close();
    await e2e?.close();
  });

  it('answers only from the evidence pack and maps citations to source ids', async () => {
    const { signUpUser, createFirmWithDomain, createMatter } = await import(
      './helpers/auth.test-utils.js'
    );
    const { db } = await import('../src/infrastructure/database/database.client.js');
    const { aiProviderConnections, facts } = await import(
      '../src/infrastructure/database/schema/index.js'
    );
    const { encryptSecret } = await import('../src/modules/ai/platform/secret-box.js');
    const { TEST_SECRET_KEY } = await import('./helpers/test-env.js');

    const user = await signUpUser(e2e.baseUrl);
    const firm = await createFirmWithDomain({
      ownerId: user.userId,
      slug: 'ai-firm',
      hostname: 'ai.depose.test',
    });
    const { matterId } = await createMatter({ firmId: firm.firmId, createdBy: user.userId });

    await db.insert(aiProviderConnections).values({
      firmId: firm.firmId,
      kind: 'openai-compatible',
      label: 'e2e-fake',
      baseUrl: fake.url,
      apiKeyCiphertext: encryptSecret('fake-key', TEST_SECRET_KEY),
      apiKeyLast4: '-key',
      models: ['fake-model'],
      fallbackModelId: 'fake-model',
      status: 'active',
      createdBy: user.userId,
    });

    const [seededFact] = await db
      .insert(facts)
      .values({
        firmId: firm.firmId,
        matterId,
        text: 'The share purchase agreement was signed on 1 March 2024.',
        normalizedText: 'the share purchase agreement was signed on 1 march 2024.',
        factType: 'event',
        status: 'confirmed',
        origin: 'manual',
      })
      .returning();

    fake.onChatCompletion(() => ({
      answer: 'The share purchase agreement was signed on 1 March 2024 [1].',
      cited: [1],
      confidence: 'high',
      insufficientEvidence: false,
    }));

    fixture = {
      cookie: user.cookie,
      firmId: firm.firmId,
      matterId,
      hostname: firm.hostname,
    };

    const response = await request(
      e2e.baseUrl,
      `/api/v1/matters/${matterId}/intelligence/ask`,
      {
        cookie: user.cookie,
        host: firm.hostname,
        body: { question: 'When was the share purchase agreement signed?' },
      },
    );

    assert.equal(response.status, 201, response.text);
    const body = response.json<{
      answer: string;
      citedSourceIds: string[];
      confidence: string;
      insufficientEvidence: boolean;
      sources: { id: string }[];
    }>();

    assert.match(body.answer, /1 March 2024/);
    assert.deepEqual(body.citedSourceIds, [seededFact.id]);
    assert.equal(body.confidence, 'high');
    assert.equal(body.insufficientEvidence, false);
    assert.equal(fake.chatCalls.length, 1, 'exactly one model call');
  });

  it('drops citations that do not point at evidence', async () => {
    fake.onChatCompletion(() => ({
      answer: 'Unsupported claim [7].',
      cited: [7],
      confidence: 'low',
      insufficientEvidence: true,
    }));

    const response = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/intelligence/realtime-check`,
      {
        cookie: fixture.cookie,
        host: fixture.hostname,
        body: { question: 'Is the witness statement consistent with the record?' },
      },
    );

    assert.equal(response.status, 201, response.text);
    assert.deepEqual(response.json<{ citedSourceIds: string[] }>().citedSourceIds, []);
  });

  it('fails honestly when the firm has no AI provider', async () => {
    const { signUpUser, createFirmWithDomain, createMatter } = await import(
      './helpers/auth.test-utils.js'
    );
    const user = await signUpUser(e2e.baseUrl);
    const firm = await createFirmWithDomain({
      ownerId: user.userId,
      slug: 'no-ai-firm',
      hostname: 'no-ai.depose.test',
    });
    const { matterId } = await createMatter({ firmId: firm.firmId, createdBy: user.userId });
    const { db } = await import('../src/infrastructure/database/database.client.js');
    const { facts } = await import('../src/infrastructure/database/schema/index.js');

    await db.insert(facts).values({
      firmId: firm.firmId,
      matterId,
      text: 'Payment was due on 30 June 2024.',
      normalizedText: 'payment was due on 30 june 2024.',
      factType: 'event',
      status: 'confirmed',
      origin: 'manual',
    });

    const response = await request(
      e2e.baseUrl,
      `/api/v1/matters/${matterId}/intelligence/ask`,
      {
        cookie: user.cookie,
        host: firm.hostname,
        body: { question: 'When was payment due?' },
      },
    );

    assert.equal(response.status, 503);
    assert.equal(response.json<{ code: string }>().code, 'AI_PROVIDER_NOT_CONFIGURED');
  });
});
