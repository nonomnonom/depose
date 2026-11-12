import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const SHOTS = '.screens';
mkdirSync(SHOTS, { recursive: true });

const email = `verify-${Date.now()}@depose.test`;
const password = 'VerifyPass123!';

const consoleErrors = [];
const failedRequests = [];

const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('console', (msg) => {
  if (msg.type() === 'error' && !msg.text().includes('401 (Unauthorized)')) {
    consoleErrors.push(`[console] ${msg.text()}`);
  }
});
page.on('pageerror', (err) => consoleErrors.push(`[pageerror] ${err.message}`));
page.on('response', (res) => {
  if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.request().method()} ${res.url()}`);
});

async function goto(path, wait = 1500) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(wait);
}

// --- Sign up against the real server -------------------------------------
await goto('/signup');
await page.locator('#signup-name').fill('Verification User');
await page.locator('#signup-email').fill(email);
await page.locator('#signup-password').fill(password);
await page.locator('#signup-confirm').fill(password);
await page.getByRole('button', { name: 'Sign up', exact: true }).click();
await page.waitForTimeout(2000);
console.log('SIGNUP', (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 200));

// --- Log in --------------------------------------------------------------
await goto('/login');
await page.locator('#login-email').fill(email);
await page.locator('#login-password').fill(password);
await page.getByRole('button', { name: 'Log in', exact: true }).click();
await page.waitForURL('**/matters', { timeout: 15000 });
console.log('LOGIN OK ->', page.url());

const meRes = await page.request.get(`${BASE}/api/v1/me`);
console.log('ME STATUS', meRes.status());

// --- Get or create a real matter ----------------------------------------
let matters = await (await page.request.get(`${BASE}/api/v1/matters`)).json();
let matterId = matters?.items?.[0]?.id;
if (!matterId) {
  const created = await page.request.post(`${BASE}/api/v1/matters`, {
    data: { name: 'Verification Matter', type: 'Litigation' },
    headers: { Origin: BASE },
  });
  console.log('CREATE MATTER', created.status(), (await created.text()).slice(0, 200));
  matters = await (await page.request.get(`${BASE}/api/v1/matters`)).json();
  matterId = matters?.items?.[0]?.id;
}
console.log('MATTER ID', matterId);

const m = matterId ?? 'missing';
const routes = [
  ['/matters', 'matters'],
  ['/notifications', 'notifications'],
  ['/settings/firm', 'settings-firm'],
  ['/settings/firm/members', 'settings-members'],
  ['/settings/firm/domains', 'settings-domains'],
  ['/settings/firm/ai', 'settings-ai'],
  ['/settings/firm/integrations/mcp', 'settings-mcp'],
  ['/settings/user/profile', 'settings-profile'],
  ['/settings/user/notifications', 'settings-notifications'],
  ['/settings/user/appearance', 'settings-appearance'],
  [`/matters/${m}/summary`, 'summary'],
  [`/matters/${m}/data/facts`, 'facts'],
  [`/matters/${m}/data/chronologies`, 'chronologies'],
  [`/matters/${m}/data/inconsistencies`, 'inconsistencies'],
  [`/matters/${m}/data/reports`, 'reports'],
  [`/matters/${m}/data/entities`, 'entities'],
  [`/matters/${m}/data/documents`, 'documents'],
  [`/matters/${m}/data/subsets`, 'subsets'],
  [`/matters/${m}/data/search`, 'search'],
  [`/matters/${m}/kim`, 'kim'],
  [`/matters/${m}/realtime`, 'realtime'],
  [`/matters/${m}/settings`, 'matter-settings'],
  [`/matters/${m}/data/documents/missing-id`, 'document-viewer'],
  [`/matters/${m}/data/subsets/missing-id`, 'subset-workspace'],
  [`/matters/${m}/data/reports/missing-id`, 'report-detail'],
  ['/404', 'error404'],
  ['/403', 'error403'],
  ['/does-not-exist', 'catchall-404'],
];

const shots = new Set(['matters', 'facts', 'entities', 'kim', 'documents', 'settings-firm']);
for (const [path, label] of routes) {
  try {
    await goto(path, 1200);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 180);
    console.log(`ROUTE ${path} | ${text}`);
    if (shots.has(label)) await page.screenshot({ path: `${SHOTS}/${label}.png`, fullPage: false });
  } catch (err) {
    console.log(`ROUTE ${path} | FAILED ${err.message}`);
  }
}

// --- Command palette -----------------------------------------------------
await goto('/matters', 600);
await page.keyboard.press('Control+k');
await page.waitForTimeout(500);
console.log('PALETTE OPEN', await page.getByPlaceholder('Search pages...').isVisible().catch(() => false));
await page.screenshot({ path: `${SHOTS}/palette.png` });
await page.keyboard.press('Escape');

console.log('CONSOLE ERRORS', JSON.stringify(consoleErrors, null, 2));
console.log('FAILED REQUESTS', JSON.stringify([...new Set(failedRequests)], null, 2));
await browser.close();
