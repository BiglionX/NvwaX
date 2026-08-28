// UI/UX evaluation screenshot capture
import { chromium } from 'playwright';

const base = 'http://localhost:3000';
const outDir = 'D:/BigLionX/NvwaX/ui-eval-shots';
import { mkdirSync } from 'fs';
mkdirSync(outDir, { recursive: true });

const shots = [
  { name: 'home', path: '/', w: 1440, h: 900 },
  { name: 'home-mobile', path: '/', w: 390, h: 844 },
  { name: 'login', path: '/login', w: 1440, h: 900 },
  { name: 'marketplace', path: '/marketplace', w: 1440, h: 900 },
  { name: 'dashboard', path: '/dashboard', w: 1440, h: 900 },
  { name: 'search', path: '/search', w: 1440, h: 900 },
  { name: 'bounties', path: '/bounties', w: 1440, h: 900 },
  { name: 'faq', path: '/faq', w: 1440, h: 900 },
  { name: 'projects', path: '/projects', w: 1440, h: 900 },
  { name: 'profile', path: '/profile', w: 1440, h: 900 },
  { name: 'settings', path: '/settings', w: 1440, h: 900 },
  { name: 'team-skills', path: '/team-skills', w: 1440, h: 900 },
  { name: 'about', path: '/about', w: 1440, h: 900 },
  { name: 'terms', path: '/terms', w: 1440, h: 900 },
  { name: 'register', path: '/register', w: 1440, h: 900 },
  { name: 'admin-login', path: '/admin/login', w: 1440, h: 900 },
];

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// console error collection
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text().slice(0, 200));
});
page.on('pageerror', (err) => errors.push('PAGEERROR: ' + String(err).slice(0, 200)));

for (const s of shots) {
  try {
    await page.setViewportSize({ width: s.w, height: s.h });
    const url = base + (s.path === '/' ? '/zh' : '/zh' + s.path);
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const file = `${outDir}/${s.name}.png`;
    await page.screenshot({ path: file, fullPage: false });
    console.log(`OK ${s.name} status=${resp ? resp.status() : 'n/a'} -> ${file}`);
  } catch (e) {
    console.log(`FAIL ${s.name}: ${String(e).slice(0, 300)}`);
  }
}

// Also capture full-page of home
try {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base + '/zh', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${outDir}/home-full.png`, fullPage: true });
  console.log('OK home-full');
} catch (e) {
  console.log('FAIL home-full: ' + String(e).slice(0, 300));
}

console.log('--- CONSOLE ERRORS ---');
const unique = [...new Set(errors)];
unique.slice(0, 40).forEach((e) => console.log(e));

await browser.close();
