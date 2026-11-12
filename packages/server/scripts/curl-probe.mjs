import { randomUUID } from 'node:crypto';

const BASE = 'http://127.0.0.1:3001';
const ORIGIN = 'http://localhost:3000';

async function request(url, options = {}) {
  const { body, headers: extraHeaders, ...fetchOpts } = options;
  const headers = new Headers(extraHeaders);
  headers.set('origin', ORIGIN);
  if (body !== undefined) {
    headers.set('content-type', 'application/json');
  }
  const init = { method: fetchOpts.method || 'GET', headers, body: body ? JSON.stringify(body) : undefined };
  const resp = await fetch(url, init);
  return {
    status: resp.status,
    headers: resp.headers,
    json: () => resp.json(),
    text: () => resp.text(),
  };
}

function cookieFrom(headers) {
  const cookies = headers.getSetCookie();
  if (cookies.length === 0) return '';
  return cookies.map((v) => v.split(';')[0]).join('; ');
}

async function main() {
  console.log('=== Curl Probe: New Endpoints ===\n');

  // 1. Sign up
  const email = `probe-${Date.now()}-${randomUUID().slice(0, 8)}@example.test`;
  const signup = await request(`${BASE}/api/auth/sign-up/email`, {
    method: 'POST',
    body: { email, password: 'correct-horse-battery', name: 'Probe User' },
  });
  console.log('1. POST /api/auth/sign-up/email →', signup.status);
  const cookie = cookieFrom(signup.headers);
  const body = await signup.json();
  console.log('   User:', body.user?.id, body.user?.email);
  if (!cookie || !body.user?.id) { console.error('FAILED'); process.exit(1); }
  const userId = body.user.id;

  // 2. GET /api/v1/me
  const me = await request(`${BASE}/api/v1/me`, { headers: { Cookie: cookie } });
  console.log('\n2. GET /api/v1/me →', me.status);
  console.log('   Setup required:', me.json().setupRequired);

  // 3. Create firm (direct DB insert, mirrors createFirmWithDomain)
  const { db } = await import('../dist/infrastructure/database/database.client.js');
  const { organization, member, firms, firmDomains, matters } = await import('../dist/infrastructure/database/schema/index.js');
  const orgId = randomUUID();
  const firmName = `Probe Firm ${Date.now()}`;
  const hostname = `probe-${Date.now().toString(36)}.depose.test`;

  await db.insert(organization).values({ id: orgId, name: firmName, slug: orgId });
  await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId: body.user.id, role: 'admin' });
  const [firm] = await db.insert(firms).values({ organizationId: orgId, name: firmName, slug: orgId, jurisdiction: 'ID', ownerId: body.user.id }).returning();
  await db.insert(firmDomains).values({ firmId: firm.id, hostname, domainType: 'subdomain', isPrimary: true, status: 'active', verifiedAt: new Date() });
  console.log('\n3. Created firm:', firm.id, 'hostname:', hostname);

  // 4. Create matter
  const [matterRow] = await db.insert(matters).values({ firmId: firm.id, name: 'Probe Matter', createdBy: body.user.id }).returning();
  console.log('   Matter:', matterRow.id);

  const headers = { Cookie: cookie, 'x-depose-host': hostname, origin: ORIGIN };

  // Probe endpoints that don't need a matter
  console.log('\n--- Endpoints (no matter needed) ---');

  // 5. GET /api/v1/me/permissions
  const perms = await request(`${BASE}/api/v1/me/permissions`, { headers });
  console.log('5. GET /api/v1/me/permissions →', perms.status);

  // 6. GET /api/v1/health
  const health = await request(`${BASE}/api/health`);
  console.log('6. GET /api/health →', health.status, (await health.json()).status);

  // Now probe matter-scoped endpoints
  console.log('\n--- Endpoints (matter-scoped) ---');

  // 7. GET /api/v1/matters/:id/facts (list, should be empty)
  const factsList = await request(`${BASE}/api/v1/matters/${matterRow.id}/facts`, { headers });
  console.log('7. GET /api/v1/matters/:id/facts →', factsList.status);

  // 8. POST /api/v1/matters/:id/facts/extract
  const extract = await request(`${BASE}/api/v1/matters/${matterRow.id}/facts/extract`, {
    method: 'POST',
    headers,
    body: {},
  });
  console.log('8. POST /api/v1/matters/:id/facts/extract →', extract.status);

  // 9. GET /api/v1/matters/:id/issues (list)
  const issues = await request(`${BASE}/api/v1/matters/${matterRow.id}/issues`, { headers });
  console.log('9. GET /api/v1/matters/:id/issues →', issues.status);

  // 10. POST /api/v1/matters/:id/intelligence/analysis/run
  const analysis = await request(`${BASE}/api/v1/matters/${matterRow.id}/intelligence/analysis/run`, {
    method: 'POST',
    headers,
    body: {},
  });
  console.log('10. POST /api/v1/matters/:id/intelligence/analysis/run →', analysis.status);

  // 11. POST /api/v1/matters/:id/intelligence/relevance/classify
  const relevance = await request(`${BASE}/api/v1/matters/${matterRow.id}/intelligence/relevance/classify`, {
    method: 'POST',
    headers,
    body: {},
  });
  console.log('11. POST /api/v1/matters/:id/intelligence/relevance/classify →', relevance.status);

  // 12. POST /api/v1/matters/:id/intelligence/summary-theme/generate
  const summaryTheme = await request(`${BASE}/api/v1/matters/${matterRow.id}/intelligence/summary-theme/generate`, {
    method: 'POST',
    headers,
    body: {},
  });
  console.log('12. POST /api/v1/matters/:id/intelligence/summary-theme/generate →', summaryTheme.status);

  // 13. POST /api/v1/matters/:id/outputs/create
  const outputsCreate = await request(`${BASE}/api/v1/matters/${matterRow.id}/outputs/create`, {
    method: 'POST',
    headers,
    body: {},
  });
  console.log('13. POST /api/v1/matters/:id/outputs/create →', outputsCreate.status);

  // 14. GET /api/v1/matters/:id/outputs
  const outputsList = await request(`${BASE}/api/v1/matters/${matterRow.id}/outputs`, { headers });
  console.log('14. GET /api/v1/matters/:id/outputs →', outputsList.status);

  console.log('\n=== Done ===');
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  console.error(e.stack);
  process.exit(1);
});
