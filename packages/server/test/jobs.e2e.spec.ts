import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import type { Job } from 'bullmq';
import type { E2EApp } from './helpers/e2e-app.factory.js';
import { request } from './helpers/http.js';

const DOCUMENT_TEXT = 'The lease started on 1 January 2023 and ends on 31 December 2025.';

interface JobFixture {
  firmId: string;
  matterId: string;
  userId: string;
  documentId: string;
}

function asJob(data: Record<string, unknown>): Job {
  return { data } as Job;
}

describe('Job handlers', () => {
  let e2e: E2EApp;
  let fixture: JobFixture;
  let jobs: import('../src/modules/jobs/jobs.service.js').JobsService;
  let processor: import('../src/modules/documents/ingest.processor.js').IngestProcessor;

  before(async () => {
    const { createE2EApp } = await import('./helpers/e2e-app.factory.js');
    e2e = await createE2EApp();

    const { signUpUser, createFirmWithDomain, createMatter } = await import(
      './helpers/auth.test-utils.js'
    );
    const { JobsService } = await import('../src/modules/jobs/jobs.service.js');
    const { IngestProcessor } = await import('../src/modules/documents/ingest.processor.js');

    jobs = e2e.app.get(JobsService);
    processor = e2e.app.get(IngestProcessor);

    const user = await signUpUser(e2e.baseUrl);
    const firm = await createFirmWithDomain({
      ownerId: user.userId,
      hostname: 'jobs.depose.test',
    });
    const matter = await createMatter({ firmId: firm.firmId, createdBy: user.userId });
    const upload = await request(
      e2e.baseUrl,
      `/api/v1/matters/${matter.matterId}/documents?fileName=lease.txt`,
      {
        cookie: user.cookie,
        host: firm.hostname,
        rawBody: new TextEncoder().encode(DOCUMENT_TEXT),
        headers: { 'content-type': 'text/plain' },
      },
    );
    assert.equal(upload.status, 201, upload.text);

    fixture = {
      firmId: firm.firmId,
      matterId: matter.matterId,
      userId: user.userId,
      documentId: upload.json<{ document: { id: string } }>().document.id,
    };
  });

  after(async () => {
    await e2e?.close();
  });

  it('marks a successful ingest job as succeeded with its result', async () => {
    const { db } = await import('../src/infrastructure/database/database.client.js');
    const { jobs: jobsTable } = await import('../src/infrastructure/database/schema/index.js');
    const { eq } = await import('drizzle-orm');

    const jobId = randomUUID();
    await db.insert(jobsTable).values({
      id: jobId,
      firmId: fixture.firmId,
      matterId: fixture.matterId,
      jobKey: 'document.ingest',
      queueName: 'document.ingest',
      idempotencyKey: `handler-success:${jobId}`,
      payload: { jobId, documentId: fixture.documentId },
      createdBy: fixture.userId,
    });

    const result = await processor.process(
      asJob({ jobId, documentId: fixture.documentId }),
    );

    assert.equal(result.documentId, fixture.documentId);
    assert.equal(result.status, 'done');
    assert.equal(result.pageCount, 1);

    const [row] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    assert.equal(row.status, 'succeeded');
    assert.equal(row.progress, 100);
    assert.equal(row.attempts, 1);
    assert.deepEqual(row.result, result);
  });

  it('requeues a retryable failure and records the error', async () => {
    const { db } = await import('../src/infrastructure/database/database.client.js');
    const { jobs: jobsTable } = await import('../src/infrastructure/database/schema/index.js');
    const { eq } = await import('drizzle-orm');

    const jobId = randomUUID();
    const missingDocumentId = randomUUID();
    await db.insert(jobsTable).values({
      id: jobId,
      firmId: fixture.firmId,
      matterId: fixture.matterId,
      jobKey: 'document.ingest',
      queueName: 'document.ingest',
      idempotencyKey: `handler-failure:${jobId}`,
      payload: { jobId, documentId: missingDocumentId },
      createdBy: fixture.userId,
      maxAttempts: 3,
    });

    await assert.rejects(() =>
      processor.process(asJob({ jobId, documentId: missingDocumentId })),
    );

    const [row] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    assert.equal(row.status, 'queued', 'retryable failure goes back to the queue');
    assert.equal(row.stage, 'retry');
    assert.equal(row.errorCode, 'INTERNAL_ERROR');
    assert.equal(row.attempts, 1);
  });

  it('refuses a payload without ids', async () => {
    await assert.rejects(() => processor.process(asJob({ documentId: fixture.documentId })), {
      message: /missing ids/i,
    });
  });

  it('reports a terminal state once attempts are exhausted', async () => {
    const { db } = await import('../src/infrastructure/database/database.client.js');
    const { jobs: jobsTable } = await import('../src/infrastructure/database/schema/index.js');
    const { eq } = await import('drizzle-orm');

    const jobId = randomUUID();
    const missingDocumentId = randomUUID();
    await db.insert(jobsTable).values({
      id: jobId,
      firmId: fixture.firmId,
      matterId: fixture.matterId,
      jobKey: 'document.ingest',
      queueName: 'document.ingest',
      idempotencyKey: `handler-dead:${jobId}`,
      payload: { jobId, documentId: missingDocumentId },
      createdBy: fixture.userId,
      maxAttempts: 1,
    });

    await assert.rejects(() =>
      processor.process(asJob({ jobId, documentId: missingDocumentId })),
    );

    const [row] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    assert.equal(row.status, 'dead');
    assert.equal(row.errorCode, 'INTERNAL_ERROR');
  });
});
