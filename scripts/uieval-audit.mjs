// DOM-level UI/UX audit: overflow, dead links, a11y gaps, blank content
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const base = 'http://localhost:3000';
const routes = ['/', '/login', '/marketplace', '/dashboard', '/search', '/bounties', '/faq',
  '/projects', '/profile', '/settings', '/team-skills', '/about', '/terms', '/register', '/admin/login',
  '/token-usage', '/token-purchase', '/agent-repository', '/my-bounties', '/microbiz', '/developer',
  '/privacy', '/dsh', '/test-connection'];

const report = { routes: [], issues: [] };

const browser = await chromium.launch({ channel: 'msedge' });

// --- Desktop audit ---
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
for (const r of routes) {
  try {
    const resp = await page.goto(base + '/zh' + r, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(1200);
    const info = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const overflows = [];
      document.querySelectorAll('body *').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.right > vw + 2 && rect.width > 0 && getComputedStyle(el).position !== 'fixed') {
          const tag = el.tagName.toLowerCase();
          const cls = (el.className && typeof el.className === 'string') ? el.className.slice(0, 60) : '';
          if (overflows.length < 15) overflows.push(`${tag}.${cls} right=${Math.round(rect.right)}`);
        }
      });
      const text = (document.body.innerText || '').trim();
      const imgs = [...document.querySelectorAll('img')];
      const noAlt = imgs.filter((i) => !i.hasAttribute('alt') || i.getAttribute('alt') === '').length;
      const buttons = [...document.querySelectorAll('button')];
      const noName = buttons.filter((b) => !(b.innerText || '').trim() && !b.getAttribute('aria-label') && !b.getAttribute('title')).length;
      const h1 = document.querySelector('h1')?.innerText?.trim() || null;
      return { overflowCount: overflows.length, overflows, textLen: text.length, textSample: text.slice(0, 120),
        imgCount: imgs.length, noAlt, btnCount: buttons.length, noName, h1, title: document.title };
    });
    report.routes.push({ route: r, status: resp ? resp.status() : 'n/a', ...info });
  } catch (e) {
    report.routes.push({ route: r, error: String(e).slice(0, 200) });
  }
}

// --- Mobile audit (390px) for key routes ---
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
for (const r of ['/', '/marketplace', '/bounties', '/projects', '/profile']) {
  try {
    await mobile.goto(base + '/zh' + r, { waitUntil: 'networkidle', timeout: 25000 });
    await mobile.waitForTimeout(1000);
    const info = await mobile.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const overflows = [];
      document.querySelectorAll('body *').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.right > vw + 2 && rect.width > 0) {
          const tag = el.tagName.toLowerCase();
          const cls = (el.className && typeof el.className === 'string') ? el.className.slice(0, 50) : '';
          if (overflows.length < 10) overflows.push(`${tag}.${cls} right=${Math.round(rect.right)}`);
        }
      });
      return { overflowCount: overflows.length, overflows };
    });
    report.issues.push({ scope: 'mobile', route: r, ...info });
  } catch (e) {
    report.issues.push({ scope: 'mobile', route: r, error: String(e).slice(0, 200) });
  }
}

// --- Dead link check on home & marketplace ---
const deadLinkPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await deadLinkPage.goto(base + '/zh', { waitUntil: 'networkidle', timeout: 25000 });
await deadLinkPage.waitForTimeout(1000);
const links = await deadLinkPage.evaluate(() =>
  [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h && h.startsWith('/'))
);
const uniqueLinks = [...new Set(links)];
const dead = [];
for (const l of uniqueLinks.slice(0, 40)) {
  const url = l.startsWith('/zh') ? l : '/zh' + l;
  try {
    const resp = await deadLinkPage.goto(base + url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    if (resp && resp.status() === 404) dead.push(l);
  } catch { dead.push(l + ' (err)'); }
}
report.issues.push({ scope: 'deadlinks', found: dead, checked: uniqueLinks.length });

writeFileSync('D:/BigLionX/NvwaX/ui-eval-shots/audit-report.json', JSON.stringify(report, null, 2));
console.log('Audit complete. Dead links:', JSON.stringify(dead));
console.log('Routes with overflow or issues:');
report.routes.filter((r) => r.overflowCount > 0 || r.noAlt > 0 || r.noName > 5 || (r.textLen || 0) < 50).forEach((r) => {
  console.log(`- ${r.route} status=${r.status} overflow=${r.overflowCount} textLen=${r.textLen} noAlt=${r.noAlt} noName=${r.noName} h1=${r.h1}`);
});
await browser.close();
