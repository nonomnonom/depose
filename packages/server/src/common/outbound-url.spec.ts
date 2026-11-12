import { beforeAll, describe, expect, it } from '@jest/globals';

import { applyTestEnv } from '../../test/support/env/test-env.js';

/**
 * Unit level: SSRF guard for outbound URLs. IP-literal and blocked-hostname
 * cases never touch DNS, so these run without a database, Redis, or network.
 * The environment must exist before `app.config.js` is imported because the
 * config module validates the whole environment at import time.
 */
describe('assertSafeOutboundUrl', () => {
  let assertSafeOutboundUrl: (typeof import('./outbound-url.js'))['assertSafeOutboundUrl'];

  beforeAll(async () => {
    applyTestEnv();
    /* The E2E env resolves the `auto` default permissively (any non-production
     * env); this unit spec tests the enforcing mode, so pin it before
     * `app.config.js` (and therefore this module) is imported. */
    process.env.ALLOW_PRIVATE_OUTBOUND_URLS = 'false';
    ({ assertSafeOutboundUrl } = await import('./outbound-url.js'));
  });

  it.each([
    ['not a url', 'not a url'],
    ['ftp protocol', 'ftp://example.com/file'],
    ['embedded credentials', 'https://user:pass@example.com'],
  ])('rejects %s', async (_label, raw) => {
    await expect(assertSafeOutboundUrl(raw)).rejects.toThrow();
  });

  it.each([
    ['plain http', 'http://example.com'],
    ['localhost hostname', 'https://localhost/api'],
    ['sub-domain localhost', 'https://api.localhost/v1'],
    ['local suffix', 'https://model.local'],
    ['internal suffix', 'https://metadata.internal'],
    ['cloud metadata host', 'https://metadata.google.internal/computeMetadata'],
    ['loopback ipv4', 'https://127.0.0.1:8080'],
    ['link-local ipv4', 'https://169.254.169.254/latest'],
    ['private ipv4 range', 'https://10.1.2.3/embed'],
    ['carrier-grade nat', 'https://100.64.0.9/embed'],
    ['private ipv6 loopback', 'https://[::1]:9000'],
    ['unique local ipv6', 'https://[fd00::1]/v1'],
  ])('rejects %s as a non-public target', async (_label, raw) => {
    await expect(assertSafeOutboundUrl(raw)).rejects.toThrow();
  });

  it('returns the parsed url for a public ip literal without touching dns', async () => {
    const url = await assertSafeOutboundUrl('https://8.8.8.8/v1/embed');
    expect(url.hostname).toBe('8.8.8.8');
    expect(url.protocol).toBe('https:');
  });
});
