import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { appConfig } from '../config/app.config.js';
import { DomainError } from './domain-error.js';

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata', 'metadata.google.internal']);

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80') ||
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:192.168.')
  );
}

function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return false;
}

/**
 * Rejects outbound targets that point at the host itself, private networks, or
 * cloud metadata endpoints. DNS is resolved as well so a public name cannot be
 * used to smuggle a private address.
 *
 * Set `ALLOW_PRIVATE_OUTBOUND_URLS=true` for self-hosted model servers that
 * intentionally live on localhost or a private network.
 */
export async function assertSafeOutboundUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw DomainError.validation('URL is not valid');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw DomainError.validation('Only http and https URLs are supported');
  }
  if (url.username || url.password) {
    throw DomainError.validation('URLs must not contain credentials');
  }

  if (appConfig.outbound.allowPrivateUrls) return url;

  if (url.protocol !== 'https:') {
    throw DomainError.validation('Outbound URLs must use https');
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw DomainError.validation('Outbound URL must resolve to a public address');
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw DomainError.validation('Outbound URL must resolve to a public address');
    }
    return url;
  }

  let records: { address: string }[];
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw DomainError.validation('Outbound host could not be resolved');
  }
  if (records.length === 0 || records.some((record) => isPrivateAddress(record.address))) {
    throw DomainError.validation('Outbound URL must resolve to a public address');
  }

  return url;
}
