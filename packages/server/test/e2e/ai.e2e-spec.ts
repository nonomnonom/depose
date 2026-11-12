import { afterAll, beforeAll, describe, it } from '@jest/globals';
import assert from '../support/utils/jest-assert.js';
import type { E2EApp } from '../support/app/create-test-app.js';
import type { FakeModelServer } from '../support/fakes/model-server.fake.js';
import { request } from '../support/http.js';

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

  beforeAll(async () => {
    const { createE2EApp } = await import('../support/app/create-test-app.js');
    const { startFakeModelServer } = await import('../support/fakes/model-server.fake.js');
    fake = await startFakeModelServer();
    e2e = await createE2EApp({
      AI_PROVIDER: 'openai-compatible',
      AI_BASE_URL: fake.url,
      AI_API_KEY: 'test-key',
      AI_MODEL: 'fake-model',
    });
  });

  afterAll(async () => {
    await fake?.close();
    await e2e?.close();
  });

  it('answers only from the evidence pack and maps citations to source ids', async () => {
    const { signUpUser, createFirmWithDomain, createMatter } = await import(
      '../support/auth/auth.helper.js'
    );
    const { db } = await import('../../src/infrastructure/database/database.client.js');
    const { facts } = await import('../../src/infrastructure/database/schema/index.js');

    const user = await signUpUser(e2e.baseUrl);
    const firm = await createFirmWithDomain({
      ownerId: user.userId,
      hostname: 'ai.depose.test',
    });
    const { matterId } = await createMatter({ firmId: firm.firmId, createdBy: user.userId });

    // aiProviderConnections removed: AI is operated through instance config.
    // The fake model server is configured via app config in e2e setup.

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

  it('does not leak provider configuration to the browser', async () => {
    const response = await request(e2e.baseUrl, '/api/v1/tenant');
    assert.equal(response.status, 200);
    assert.equal(response.text.includes('test-key'), false);
  });
});
