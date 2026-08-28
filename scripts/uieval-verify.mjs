import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const results = {};

// 1. Bounties: no raw keys, no MISSING_MESSAGE errors
{
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  await page.goto('http://localhost:3000/zh/bounties', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  const body = await page.evaluate(() => document.body.innerText);
  results.bounties = {
    rawKeysVisible: body.includes('bountyList.status') || body.includes('statusOpen') && body.includes('bountyList'),
    hasMISSING: errs.some((e) => e.includes('MISSING_MESSAGE')),
    statusLabelSample: (body.match(/开放中|已领取|待验证/g) || []).slice(0, 5),
    errors: errs.slice(0, 4),
  };
  page.removeAllListeners('console');
}

// 2. Developer: no FORMATTING_ERROR
{
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  await page.goto('http://localhost:3000/zh/developer', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  const body = await page.evaluate(() => document.body.innerText);
  results.developer = {
    hasFormattingError: errs.some((e) => e.includes('FORMATTING_ERROR')),
    consoleUrlLink: body.includes('console.nvwax.com'),
    rateLimitCode: body.includes('429 Too Many Requests'),
    errors: errs.slice(0, 4),
  };
  page.removeAllListeners('console');
}

// 3. Dark mode toggle on home
{
  await page.goto('http://localhost:3000/zh', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  const hasToggle = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label')?.includes('暗色') || x.getAttribute('title')?.includes('暗色'));
    return !!b;
  });
  // click the theme toggle
  const clicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label')?.includes('暗色') || x.getAttribute('title')?.includes('暗色') || x.getAttribute('aria-label')?.includes('亮色'));
    if (b) { b.click(); return true; }
    return false;
  });
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  results.darkMode = { before, after, toggleExists: hasToggle, toggleClicked: clicked, toggled: before !== after };
  // toggle back
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label')?.includes('暗色') || x.getAttribute('title')?.includes('暗色') || x.getAttribute('aria-label')?.includes('亮色'));
    if (b) b.click();
  });
  // verify persistence: reload and check class persists
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const persisted = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  const stored = await page.evaluate(() => localStorage.getItem('nvwax-theme'));
  results.darkMode.persistedAfterReload = persisted;
  results.darkMode.stored = stored;
}

// 4. bounties with dark class active — confirm dark: styles apply
{
  await page.goto('http://localhost:3000/zh/bounties', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  const bg = await page.evaluate(() => {
    const body = document.body;
    return getComputedStyle(body).backgroundColor;
  });
  results.darkMode.darkBodyBg = bg;
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
