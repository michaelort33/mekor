import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.AUDIT_BASE_URL || 'https://mekor-kappa.vercel.app';
const routes = JSON.parse(fs.readFileSync('mirror-data/content/index.json', 'utf8'))
  .map((r) => r.path)
  .filter((p) => typeof p === 'string' && p.startsWith('/'));

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
];

const screenshotDir = path.join('output', 'responsive-audit-shots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

function slugifyRoute(route) {
  if (route === '/') return 'home';
  return route
    .replace(/^\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
}

async function gotoWithRetry(page, url, attempts = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(900);
      return { ok: true, attempt };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await page.waitForTimeout(450 * attempt);
      }
    }
  }
  return {
    ok: false,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  };
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();
page.setDefaultTimeout(45000);

const issues = [];
const errors = [];

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });

  for (const path of routes) {
    const url = `${baseUrl}${path}`;
    try {
      const nav = await gotoWithRetry(page, url, 3);
      if (!nav.ok) {
        errors.push({
          viewport: vp.name,
          path,
          url,
          category: 'navigation',
          error: nav.error,
        });
        continue;
      }

      const metrics = await page.evaluate(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const doc = document.documentElement;

        const selectors = 'h1,h2,h3,h4,h5,h6,p,a,button,label,input,textarea,select,li';
        const nodes = Array.from(document.querySelectorAll(selectors));
        const offenders = [];

        for (const el of nodes) {
          const rect = el.getBoundingClientRect();
          if (rect.width < 4 || rect.height < 4) continue;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          if (Number(style.opacity || '1') < 0.05) continue;

          const isInViewportBand = rect.bottom > -80 && rect.top < vh + 2000;
          if (!isInViewportBand) continue;

          const rightOverflow = rect.right - vw;
          const leftOverflow = 0 - rect.left;

          if (rightOverflow > 6 || leftOverflow > 6) {
            offenders.push({
              tag: el.tagName.toLowerCase(),
              id: el.id || null,
              cls: (el.className || '').toString().slice(0, 80),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              rightOverflow: Math.round(rightOverflow),
              leftOverflow: Math.round(leftOverflow),
              text: (el.textContent || '').trim().slice(0, 80),
            });
          }
        }

        offenders.sort(
          (a, b) =>
            Math.max(b.rightOverflow, b.leftOverflow) -
            Math.max(a.rightOverflow, a.leftOverflow),
        );

        return {
          scrollWidth: Math.max(document.body.scrollWidth, doc.scrollWidth),
          viewportWidth: vw,
          offenders: offenders.slice(0, 18),
          offenderCount: offenders.length,
        };
      });

      const severeOverflow = metrics.offenderCount >= 8 || metrics.scrollWidth > vp.width + 8;
      if (severeOverflow) {
        const shotFile = `${vp.name}__${slugifyRoute(path)}.png`;
        const shotPath = path.join(screenshotDir, shotFile);
        await page.screenshot({ path: shotPath, fullPage: false });

        issues.push({
          viewport: vp.name,
          path,
          url,
          scrollWidth: metrics.scrollWidth,
          viewportWidth: metrics.viewportWidth,
          offenderCount: metrics.offenderCount,
          offenders: metrics.offenders,
          screenshot: shotPath,
        });
      }
    } catch (err) {
      errors.push({
        viewport: vp.name,
        path,
        url,
        category: 'runtime',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

await browser.close();

const out = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  routeCount: routes.length,
  issueCount: issues.length,
  errorCount: errors.length,
  issues,
  errors,
};

fs.writeFileSync('output/responsive-audit.json', JSON.stringify(out, null, 2));
console.log(
  `Wrote output/responsive-audit.json with ${issues.length} overflow findings and ${errors.length} non-layout errors`,
);
