import { afterAll, beforeAll, describe, it } from '@jest/globals';
import assert from './helpers/jest-assert.js';
import type { E2EApp } from './helpers/e2e-app.factory.js';
import type { FakeModelServer } from './helpers/fake-model-server.js';
import { request } from './helpers/http.js';

const QDRANT_PREFIX = `depose_e2e_workflow_${Date.now()}`;

const DOCUMENT_TEXT = [
  'On 1 March 2024, Acme agreed to pay USD 250,000 for the shares.',
  'On 1 March 2024, Acme agreed to pay USD 150,000 for the shares.',
].join('\n');

/** Minimal single-page PDF with a real text layer, so ingest exercises the PDF parser. */
function makePdf(text: string): Buffer {
  const escape = (value: string) =>
    value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const lines = text.split('\n').map(escape);
  const content = `BT /F1 12 Tf 72 720 Td (${lines[0]}) Tj 0 -18 Td (${lines[1] ?? ''}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

async function eventually<T>(
  read: () => Promise<T>,
  done: (value: T) => boolean,
  timeoutMs = 20_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let value: T | undefined;
  while (Date.now() < deadline) {
    value = await read();
    if (done(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Condition not met within ${timeoutMs}ms: ${JSON.stringify(value)}`);
}

describe('Critical matter workflow', () => {
  let e2e: E2EApp;
  let fake: FakeModelServer;
  let fixture: {
    cookie: string;
    host: string;
    matterId: string;
  };

  beforeAll(async () => {
    const { createE2EApp } = await import('./helpers/e2e-app.factory.js');
    const { startFakeModelServer } = await import('./helpers/fake-model-server.js');
    fake = await startFakeModelServer();

    fake.onChatCompletion((body) => {
      const prompt = (body.messages ?? []).map((message) => message.content).join('\n');
      if (prompt.includes('Document text:')) {
        return {
          facts: [
            {
              text: 'Acme agreed to pay USD 250,000 for the shares on 1 March 2024.',
              factType: 'amount',
              entity: 'Acme',
              action: 'agreed to pay',
              object: 'USD 250,000',
              date: '2024-03-01',
              dateText: '1 March 2024',
              datePrecision: 'day',
              sourceQuote: DOCUMENT_TEXT.split('\n')[0],
              confidence: 0.96,
            },
            {
              text: 'Acme agreed to pay USD 150,000 for the shares on 1 March 2024.',
              factType: 'amount',
              entity: 'Acme',
              action: 'agreed to pay',
              object: 'USD 150,000',
              date: '2024-03-01',
              dateText: '1 March 2024',
              datePrecision: 'day',
              sourceQuote: DOCUMENT_TEXT.split('\n')[1],
              confidence: 0.96,
            },
          ],
        };
      }
      return {
        answer: 'Acme agreed to pay USD 250,000 for the shares on 1 March 2024 [1].',
        cited: [1],
        confidence: 'high',
        insufficientEvidence: false,
      };
    });
    fake.onDecision(() => ({
      verdict: { choice: 'contradiction' },
      dimension: { choice: 'amount' },
    }));

    e2e = await createE2EApp({
      AI_PROVIDER: 'openai-compatible',
      AI_BASE_URL: `${fake.url}/v1`,
      AI_API_KEY: 'test-key',
      AI_MODEL: 'fake-model',
      EXTRACTION_PROVIDER: 'openai-compatible',
      EXTRACTION_BASE_URL: `${fake.url}/v1`,
      EXTRACTION_API_KEY: 'test-key',
      EXTRACTION_MODEL: 'fake-model',
      EXTRACTION_AUTO_RUN: 'false',
      DECISION_PROVIDER: 'openai-compatible',
      DECISION_BASE_URL: `${fake.url}/decisions`,
      DECISION_API_KEY: 'test-key',
      EMBEDDING_ENABLED: 'true',
      EMBEDDING_BASE_URL: `${fake.url}/v1`,
      EMBEDDING_API_KEY: 'test-key',
      QDRANT_URL: 'http://127.0.0.1:6333',
      QDRANT_COLLECTION_PREFIX: QDRANT_PREFIX,
      VECTOR_SEARCH_ENABLED: 'true',
      OCR_PROVIDER: 'offline',
    });

    const { signUpUser, createFirmWithDomain, createMatter } = await import(
      './helpers/auth.test-utils.js'
    );
    const user = await signUpUser(e2e.baseUrl, { name: 'Workflow Lawyer' });
    const firm = await createFirmWithDomain({
      ownerId: user.userId,
      hostname: 'workflow.depose.test',
      role: 'admin',
    });
    const { matterId } = await createMatter({
      firmId: firm.firmId,
      createdBy: user.userId,
      name: 'Acme share purchase',
    });
    fixture = { cookie: user.cookie, host: firm.hostname, matterId };
  });

  afterAll(async () => {
    await e2e?.close();
    await fake?.close();
  });

  it('uploads a document and processes it to text', async () => {
    const upload = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/documents?fileName=agreement.pdf`,
      {
        cookie: fixture.cookie,
        host: fixture.host,
        rawBody: makePdf(DOCUMENT_TEXT),
        headers: { 'content-type': 'application/pdf' },
      },
    );
    assert.equal(upload.status, 201, upload.text);
    const documentId = upload.json<{ document: { id: string } }>().document.id;

    const done = await eventually(
      async () => {
        const response = await request(
          e2e.baseUrl,
          `/api/v1/matters/${fixture.matterId}/documents/${documentId}`,
          { cookie: fixture.cookie, host: fixture.host },
        );
        return response.json<{ document: { status: string; pageCount: number } }>().document;
      },
      (document) => document.status === 'done',
    );
    assert.equal(done.pageCount, 1);

    await eventually(
      async () => {
        const response = await fetch(
          `http://127.0.0.1:6333/collections/${QDRANT_PREFIX}_chunks_v1`,
        );
        if (!response.ok) return 0;
        const body = (await response.json()) as { result?: { points_count?: number } };
        return body.result?.points_count ?? 0;
      },
      (count) => count > 0,
    );

    const extract = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/facts/extract`,
      {
        cookie: fixture.cookie,
        host: fixture.host,
        body: { documentId },
      },
    );
    assert.equal(extract.status, 202, extract.text);

    const facts = await eventually(
      async () => {
        const response = await request(
          e2e.baseUrl,
          `/api/v1/matters/${fixture.matterId}/facts`,
          { cookie: fixture.cookie, host: fixture.host },
        );
        return response.json<{
          items: { id: string; text: string; dateStart: string | null }[];
        }>().items;
      },
      (items) => items.length >= 2,
    );
    assert.equal(facts.length, 2);

    for (const fact of facts) {
      const confirmed = await request(
        e2e.baseUrl,
        `/api/v1/matters/${fixture.matterId}/facts/${fact.id}/confirm`,
        { cookie: fixture.cookie, host: fixture.host, body: {} },
      );
      assert.equal(confirmed.status, 201, confirmed.text);
    }

    const chronology = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/chronology`,
      { cookie: fixture.cookie, host: fixture.host },
    );
    assert.equal(chronology.status, 200, chronology.text);
    assert.equal(
      chronology.json<{ items: unknown[] }>().items.length,
      2,
      'both dated facts appear in the chronology',
    );

    const entity = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/entities`,
      {
        cookie: fixture.cookie,
        host: fixture.host,
        body: { canonicalName: 'Acme', type: 'organization' },
      },
    );
    assert.equal(entity.status, 201, entity.text);

    const detected = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/inconsistencies/detect`,
      { cookie: fixture.cookie, host: fixture.host, body: {} },
    );
    assert.equal(detected.status, 201, detected.text);
    assert.equal(
      detected.json<{ items: { kind: string }[] }>().items[0]?.kind,
      'amount',
    );

    const answer = await request(
      e2e.baseUrl,
      `/api/v1/matters/${fixture.matterId}/intelligence/ask`,
      {
        cookie: fixture.cookie,
        host: fixture.host,
        body: { question: 'How much did Acme agree to pay for the shares?' },
      },
    );
    assert.equal(answer.status, 201, answer.text);
    const body = answer.json<{
      answer: string;
      citedSourceIds: string[];
      insufficientEvidence: boolean;
    }>();
    assert.match(body.answer, /250,000/);
    assert.equal(body.citedSourceIds.length, 1);
    assert.equal(body.insufficientEvidence, false);
  }, 60_000);
});
