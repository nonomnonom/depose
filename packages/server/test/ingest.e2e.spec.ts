import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { E2EApp } from './helpers/e2e-app.factory.js';
import type { FakeModelServer } from './helpers/fake-model-server.js';
import { request } from './helpers/http.js';

const DOCUMENT_TEXT =
  'On 1 March 2024, the parties signed the share purchase agreement. ' +
  'The buyer agreed to pay USD 250,000 on 30 June 2024.';

async function waitFor<T>(
  read: () => Promise<T | undefined>,
  timeoutMs = 15_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await read();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('timed out waiting for condition');
}

describe('Document ingest and fact extraction', () => {
  let e2e: E2EApp;
  let fake: FakeModelServer;
  let cookie: string;
  let host: string;
  let matterId: string;
  let documentId: string;

  before(async () => {
    const { startFakeModelServer } = await import('./helpers/fake-model-server.js');
    const { createE2EApp } = await import('./helpers/e2e-app.factory.js');

    fake = await startFakeModelServer();
    e2e = await createE2EApp({ EXTRACTION_BASE_URL: fake.url });

    const { signUpUser, createFirmWithDomain, createMatter } = await import(
      './helpers/auth.test-utils.js'
    );
    const user = await signUpUser(e2e.baseUrl);
    const firm = await createFirmWithDomain({
      ownerId: user.userId,
      hostname: 'ingest.depose.test',
    });
    const matter = await createMatter({ firmId: firm.firmId, createdBy: user.userId });

    cookie = user.cookie;
    host = firm.hostname;
    matterId = matter.matterId;
  });

  after(async () => {
    await e2e?.close();
    await fake?.close();
  });

  it('uploads raw bytes and queues an ingest job', async () => {
    const response = await request(
      e2e.baseUrl,
      `/api/v1/matters/${matterId}/documents?fileName=agreement.txt`,
      {
        cookie,
        host,
        rawBody: new TextEncoder().encode(DOCUMENT_TEXT),
        headers: { 'content-type': 'text/plain' },
      },
    );

    assert.equal(response.status, 201, response.text);
    const body = response.json<{
      document: { id: string; status: string };
      jobId: string;
    }>();
    documentId = body.document.id;

    assert.equal(body.document.status, 'queued');
    assert.ok(body.jobId);

    const { db } = await import('../src/infrastructure/database/database.client.js');
    const { jobs } = await import('../src/infrastructure/database/schema/index.js');
    const { eq } = await import('drizzle-orm');

    const [job] = await db.select().from(jobs).where(eq(jobs.id, body.jobId)).limit(1);
    assert.ok(job, 'job row is persisted');
    assert.equal(job.queueName, 'document.ingest');
  });

  it('processes the document into pages and chunks', async () => {
    const { db } = await import('../src/infrastructure/database/database.client.js');
    const { documentChunks, documents } = await import(
      '../src/infrastructure/database/schema/index.js'
    );
    const { and, eq } = await import('drizzle-orm');

    const processed = await waitFor(async () => {
      const [row] = await db
        .select({ status: documents.processingStatus, pageCount: documents.pageCount })
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);
      return row && row.status === 'done' ? row : undefined;
    });

    assert.equal(processed.pageCount, 1);

    const chunks = await db
      .select()
      .from(documentChunks)
      .where(and(eq(documentChunks.documentId, documentId)));

    assert.ok(chunks.length >= 1, 'chunks were written');
    assert.match(chunks[0].content, /share purchase agreement/);

    const page = await request(
      e2e.baseUrl,
      `/api/v1/matters/${matterId}/documents/${documentId}/pages/1`,
      { cookie, host },
    );
    assert.equal(page.status, 200, page.text);
    assert.match(page.json<{ text: string }>().text, /USD 250,000/);
  });

  it('extracts facts with verified quotes from the document', async () => {
    fake.onChatCompletion(() => ({
      facts: [
        {
          text: 'The parties signed the share purchase agreement on 1 March 2024.',
          factType: 'event',
          entity: 'the parties',
          action: 'signed',
          object: 'share purchase agreement',
          date: '2024-03-01',
          dateText: '1 March 2024',
          datePrecision: 'day',
          sourceQuote: 'the parties signed the share purchase agreement',
          confidence: 0.95,
        },
      ],
    }));

    const requested = await request(
      e2e.baseUrl,
      `/api/v1/matters/${matterId}/facts/extract`,
      { cookie, host, body: {} },
    );

    assert.equal(requested.status, 202, requested.text);
    const accepted = requested.json<{ accepted: boolean; jobIds: string[] }>();
    assert.equal(accepted.accepted, true);
    assert.equal(accepted.jobIds.length, 1);

    const extracted = await waitFor(async () => {
      const { db } = await import('../src/infrastructure/database/database.client.js');
      const { extractionRuns, factSources, facts } = await import(
        '../src/infrastructure/database/schema/index.js'
      );
      const { and, eq } = await import('drizzle-orm');

      const [run] = await db
        .select()
        .from(extractionRuns)
        .where(eq(extractionRuns.documentId, documentId))
        .limit(1);
      if (!run || (run.status !== 'succeeded' && run.status !== 'partial')) return undefined;

      const rows = await db
        .select({ id: facts.id, text: facts.text, status: facts.status })
        .from(facts)
        .where(and(eq(facts.matterId, matterId), eq(facts.firmId, run.firmId)));
      if (rows.length === 0) return undefined;

      const [source] = await db
        .select({ quote: factSources.quote, verification: factSources.verification })
        .from(factSources)
        .where(eq(factSources.factId, rows[0].id))
        .limit(1);

      return { run, fact: rows[0], source };
    });

    assert.equal(extracted.fact.status, 'proposed');
    assert.match(extracted.fact.text, /share purchase agreement/);
    assert.equal(extracted.source?.quote, 'the parties signed the share purchase agreement');
    assert.equal(extracted.source?.verification, 'verified');
    assert.equal(extracted.run.counts.candidates, 1);
  });
});
