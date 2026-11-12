/* Temporary runtime verification: signup -> setup -> create matter -> route sweep. Deleted after use. */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const email = `verify-${Date.now()}@example.test`;
const password = 'correct-horse-battery';

const results = { steps: [], matterId: null, routes: [], consoleErrors: {}, pageErrors: [], failedRequests: [] };

function collect(page, label) {
  page.on('console', (m) => {
    if (m.type() === 'error') (results.consoleErrors[label] ??= []).push(m.text().slice(0, 400));
  });
  page.on('pageerror', (e) => results.pageErrors.push(`${label}: ${String(e.message).slice(0, 400)}`));
  page.on('response', (r) => {
    if (r.status() >= 400) results.failedRequests.push(`${label}: ${r.status()} ${r.url().slice(0, 160)}`);
  });
}

const browser = await chromium.launch();
let matterId = null;
const ctx = await browser.newContext({ baseURL: BASE });
const page = await ctx.newPage();
collect(page, 'flow');

async function step(name, fn) {
  try {
    await fn();
    results.steps.push(`${name}: OK`);
  } catch (e) {
    results.steps.push(`${name}: FAIL - ${String(e).slice(0, 300)}`);
  }
}

await step('root redirects to /login', async () => {
  await page.goto('/');
  await page.waitForURL(/\/login/, { timeout: 20000 });
});

await step('signup', async () => {
  await page.goto('/signup');
  await page.getByPlaceholder('Your name').fill('Verifier');
  await page.getByPlaceholder('name@firm.com').fill(email);
  const pws = page.locator('input[type="password"]');
  await pws.nth(0).fill(password);
  await pws.nth(1).fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/setup/, { timeout: 25000 });
});

await step('setup firm', async () => {
  await page.getByPlaceholder('Test Firm').fill('Verifier & Co');
  await page.getByPlaceholder('e.g. US').fill('US');
  await page.getByRole('button', { name: 'Create firm' }).click();
  await page.waitForURL(/\/matters/, { timeout: 25000 });
});

await step('create matter via UI', async () => {
  await page.getByRole('button', { name: 'Create matter' }).first().click();
  await page.locator('#matter-name').fill('Verifier matter');
  await page.getByRole('button', { name: 'Create matter' }).last().click();
  await page.getByText('Verifier matter').first().waitFor({ timeout: 15000 });
  matterId = await page.evaluate(async () => {
    const res = await fetch('/api/v1/matters', { credentials: 'include' });
    const json = await res.json();
    const items = json?.data?.items ?? json?.items ?? [];
    return items[0]?.id ?? null;
  });
  results.matterId = matterId;
});

const sweep = [
  '/matters',
  '/notifications',
  '/403',
  '/404',
  '/this-route-does-not-exist',
  '/settings/firm',
  '/settings/firm/members',
  '/settings/firm/domains',
  '/settings/firm/ai',
  '/settings/firm/integrations/mcp',
  '/settings/user/profile',
  '/settings/user/notifications',
  '/settings/user/appearance',
];
if (matterId) {
  sweep.push(
    `/matters/${matterId}/summary`,
    `/matters/${matterId}/data/facts`,
    `/matters/${matterId}/data/chronologies`,
    `/matters/${matterId}/data/inconsistencies`,
    `/matters/${matterId}/data/reports`,
    `/matters/${matterId}/data/entities`,
    `/matters/${matterId}/data/documents`,
    `/matters/${matterId}/data/subsets`,
    `/matters/${matterId}/data/search`,
    `/matters/${matterId}/kim`,
    `/matters/${matterId}/realtime`,
    `/matters/${matterId}/settings`,
  );
}

for (const path of sweep) {
  const sub = await ctx.newPage();
  collect(sub, path);
  try {
    await sub.goto(path, { waitUntil: 'load', timeout: 20000 });
    await sub.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await sub.waitForTimeout(600);
    const text = (await sub.locator('body').innerText()).slice(0, 120).replace(/\s+/g, ' ');
    results.routes.push(`${path}: LOADED | "${text}"`);
  } catch (e) {
    results.routes.push(`${path}: ERROR - ${String(e).slice(0, 200)}`);
  }
  await sub.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 1));
