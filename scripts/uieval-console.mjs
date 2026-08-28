// Per-page console error localization
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const base = 'http://localhost:3000';
const routes = ['/', '/marketplace', '/bounties', '/team-skills', '/search', '/faq', '/about', '/developer', '/dsh', '/login', '/register', '/admin/login'];
const out = {};

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const r of routes) {
  const errs = [];
  const handler = (msg) => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') errs.push(`[${t}] ${msg.text().slice(0, 300)}`);
  };
  const pageErr = (e) => errs.push('[pageerror] ' + String(e).slice(0, 300));
  page.on('console', handler);
  page.on('pageerror', pageErr);
  try {
    await page.goto(base + '/zh' + r, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(1500);
  } catch (e) {
    errs.push('[nav] ' + String(e).slice(0, 150));
  }
  page.off('console', handler);
  page.off('pageerror', pageErr);
  const uniq = [...new Set(errs)].slice(0, 8);
  if (uniq.length) out[r] = uniq;
}

writeFileSync('D:/BigLionX/NvwaX/ui-eval-shots/console-errors.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
