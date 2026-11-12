import { afterAll, beforeAll, describe, it } from '@jest/globals';
import assert from '../support/utils/jest-assert.js';
import type { E2EApp } from '../support/app/create-test-app.js';
import { request } from '../support/http.js';

describe('Auth session lifecycle @smoke', () => {
  let e2e: E2EApp;

  beforeAll(async () => {
    const { createE2EApp } = await import('../support/app/create-test-app.js');
    e2e = await createE2EApp();
  });

  afterAll(async () => {
    await e2e?.close();
  });

  it('signs up, resolves the session, and rejects a missing cookie', async () => {
    const { signUpUser } = await import('../support/auth/auth.helper.js');
    const user = await signUpUser(e2e.baseUrl);

    const anonymous = await request(e2e.baseUrl, '/api/v1/me');
    assert.equal(anonymous.status, 401);

    const me = await request(e2e.baseUrl, '/api/v1/me', { cookie: user.cookie });
    assert.equal(me.status, 200);
    const body = me.json<{ user: { id: string; email: string }; firm: unknown }>();
    assert.equal(body.user.id, user.userId);
    assert.equal(body.user.email, user.email);
    assert.equal(body.firm, null, 'a user without a firm has no tenant yet');
  });

  it('signs in again with the same credentials', async () => {
    const { signUpUser, signInUser } = await import('../support/auth/auth.helper.js');
    const user = await signUpUser(e2e.baseUrl);

    const cookie = await signInUser(e2e.baseUrl, user.email, user.password);
    const me = await request(e2e.baseUrl, '/api/v1/me', { cookie });

    assert.equal(me.status, 200);
    assert.equal(me.json<{ user: { email: string } }>().user.email, user.email);
  });

  it('returns the firm and role once the user is a member', async () => {
    const { signUpUser, createFirmWithDomain } = await import('../support/auth/auth.helper.js');
    const user = await signUpUser(e2e.baseUrl);
    const firm = await createFirmWithDomain({ ownerId: user.userId, role: 'lawyer' });

    const me = await request(e2e.baseUrl, '/api/v1/me', {
      cookie: user.cookie,
      host: firm.hostname,
    });

    assert.equal(me.status, 200);
    const body = me.json<{
      firm: { id: string; role: string } | null;
    }>();
    assert.equal(body.firm?.id, firm.firmId);
    assert.equal(body.firm?.role, 'lawyer');
  });

  it('revokes the session on sign-out', async () => {
    const { signUpUser } = await import('../support/auth/auth.helper.js');
    const user = await signUpUser(e2e.baseUrl);

    const signOut = await request(e2e.baseUrl, '/api/auth/sign-out', {
      cookie: user.cookie,
      body: {},
    });
    assert.equal(signOut.status, 200);

    const me = await request(e2e.baseUrl, '/api/v1/me', { cookie: user.cookie });
    assert.equal(me.status, 401);
  });

  it('never accepts a forged session cookie', async () => {
    const me = await request(e2e.baseUrl, '/api/v1/me', {
      cookie: 'depose.session_token=forged-token-value',
    });

    assert.equal(me.status, 401);
  });
});
