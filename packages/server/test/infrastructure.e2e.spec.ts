import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { E2EApp } from './helpers/e2e-app.factory.js';
import { request } from './helpers/http.js';

describe('E2E infrastructure', () => {
  let e2e: E2EApp;

  before(async () => {
    const { createE2EApp } = await import('./helpers/e2e-app.factory.js');
    e2e = await createE2EApp();
  });

  after(async () => {
    await e2e?.close();
  });

  it('serves /api/health without a session', async () => {
    const response = await request(e2e.baseUrl, '/api/health');

    assert.equal(response.status, 200);
    assert.deepEqual(response.json(), { status: 'ok' });
  });

  it('boots against a migrated database', async () => {
    const { db } = await import('../src/infrastructure/database/database.client.js');
    const { firms, jobs, contradictions } = await import(
      '../src/infrastructure/database/schema/index.js'
    );

    for (const table of [firms, jobs, contradictions]) {
      const rows = await db.select().from(table).limit(1);
      assert.ok(Array.isArray(rows), 'migrated table is queryable');
    }
  });

  it('rejects a protected route without a session', async () => {
    const response = await request(e2e.baseUrl, '/api/v1/matters', {
      host: 'localhost',
    });

    assert.equal(response.status, 401);
  });
});
