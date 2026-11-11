import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { E2EApp } from './helpers/e2e-app.factory.js';
import { request } from './helpers/http.js';

/**
 * Boots the whole app and exercises every read endpoint a matter workspace
 * calls. A 5xx here means a module was never wired, a query is invalid, or a
 * serializer throws — all of which are invisible to unit-level tests.
 */
describe('Read route smoke', () => {
  let e2e: E2EApp;
  let cookie: string;
  let host: string;
  let matterId: string;

  before(async () => {
    const { createE2EApp } = await import('./helpers/e2e-app.factory.js');
    e2e = await createE2EApp();

    const { signUpUser, createFirmWithDomain, createMatter } = await import(
      './helpers/auth.test-utils.js'
    );
    const user = await signUpUser(e2e.baseUrl, { name: 'Smoke Admin' });
    const firm = await createFirmWithDomain({
      ownerId: user.userId,
      slug: 'smoke-firm',
      hostname: 'smoke.depose.test',
      role: 'admin',
    });
    const matter = await createMatter({
      firmId: firm.firmId,
      createdBy: user.userId,
      name: 'Smoke matter',
    });
    cookie = user.cookie;
    host = firm.hostname;
    matterId = matter.matterId;
  });

  after(async () => {
    await e2e?.close();
  });

  const matterRoutes = [
    '',
    '/overview',
    '/documents',
    '/facts',
    '/chronology',
    '/inconsistencies',
    '/inconsistencies/summary',
    '/intelligence/chronology',
    '/subsets',
    '/issues',
    '/entities',
    '/relevance',
    '/summary-theme/themes',
    '/summary-theme/summaries',
    '/realtime/sessions',
    '/outputs',
    '/threads',
    '/search?q=smoke',
  ];

  for (const route of matterRoutes) {
    it(`GET /api/v1/matters/:id${route}`, async () => {
      const response = await request(e2e.baseUrl, `/api/v1/matters/${matterId}${route}`, {
        cookie,
        host,
      });
      assert.ok(
        response.status < 500,
        `${route || '/'} returned ${response.status}: ${response.text}`,
      );
      assert.equal(response.status, 200, response.text);
    });
  }

  const firmRoutes = [
    '/api/v1/me',
    '/api/v1/me/permissions',
    '/api/v1/me/preferences',
    '/api/v1/firm',
    '/api/v1/firm/settings',
    '/api/v1/firm/domains',
    '/api/v1/firm/members',
    '/api/v1/firm/invitations',
    '/api/v1/firm/mcp/servers',
    '/api/v1/firm/ai/providers',
    '/api/v1/firm/ai/providers/routes',
    '/api/v1/firm/ai/providers/catalogue',
    '/api/v1/firm/ai/providers/health',
    '/api/v1/firm/jobs',
    '/api/v1/api-keys',
    '/api/v1/notifications',
    '/api/v1/notifications/unread-count',
    '/api/v1/onboarding',
    '/api/v1/tenant',
    '/api/v1/matters',
  ];

  for (const route of firmRoutes) {
    it(`GET ${route}`, async () => {
      const response = await request(e2e.baseUrl, route, { cookie, host });
      assert.ok(response.status < 500, `${route} returned ${response.status}: ${response.text}`);
      assert.equal(response.status, 200, response.text);
    });
  }
});
