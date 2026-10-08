// NODE_PATH must resolve Playwright. Start the local preview on port 4173.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const output = path.resolve(__dirname, '../output/qa');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
  const report = [];
  let exploredViews = 0;
  try {
    for (const name of ['beauty', 'health']) {
      for (const lang of ['en', 'es']) {
        const context = await browser.newContext({ reducedMotion: 'reduce' });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => {
          if (response.url().startsWith(base) && response.status() >= 400) errors.push(response.url());
        });
        await page.goto(`${base}/${name}.html?lang=${lang}`);
        await page.waitForFunction(language => document.documentElement.lang === language && window.RXSZ?.t('hero.title_1'), lang);
        await page.evaluate(async () => {
          await document.fonts.ready;
          const images = [...document.images];
          images.forEach(image => { image.loading = 'eager'; });
          await Promise.all(images.map(image => image.decode()));
        });
        for (const width of [320, 390, 600, 768, 980, 1024, 1440]) {
          await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
          const metrics = await page.evaluate(() => {
            const visible = element => !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
            const rect = element => element.getBoundingClientRect();
            const overflowing = [...document.querySelectorAll('main *, header *, footer *')].filter(element => {
              if (!visible(element)) return false;
              const box = rect(element);
              return box.right > innerWidth + 1 || box.left < -1;
            }).map(element => element.tagName + '.' + element.className);
            const badAnchors = [...document.querySelectorAll('a[href^="#"]')].filter(a => !document.getElementById(a.hash.slice(1))).map(a => a.hash);
            const broken = [...document.images].filter(image => !image.complete || !image.naturalWidth).map(image => image.src);
            const activePage = document.querySelector('.rxsz-paths [aria-current="page"]');
            const header = rect(document.querySelector('[data-nav]'));
            const photo = rect(document.querySelector('.rxsz-auth-hero__media'));
            const heading = rect(document.querySelector('h1'));
            return {
              overflowing, badAnchors, broken,
              lang: document.documentElement.lang,
              languageAvailable: [...document.querySelectorAll('[data-lang]')].every(visible),
              activePage: activePage?.getAttribute('href'),
              imageClearOfText: photo.left >= heading.right - 1 || photo.top >= heading.bottom - 1,
              headerHeight: header.height,
              documentWidth: document.documentElement.scrollWidth,
            };
          });
          assert.deepEqual(metrics.overflowing, [], `${name}/${lang}/${width}: overflowing elements`);
          assert.deepEqual(metrics.badAnchors, [], 'Invalid section destinations');
          assert.deepEqual(metrics.broken, [], 'Broken images');
          assert.ok(metrics.documentWidth <= width, 'Horizontal page overflow');
          assert.ok(metrics.languageAvailable, 'Language controls missing');
          assert.ok(metrics.imageClearOfText, 'Hero image and heading overlap');
          assert.ok(new URL(metrics.activePage, base).pathname.endsWith(`/${name}.html`), 'Wrong page highlighted');
          report.push({ page: name, language: lang, width, ...metrics });
          if (width === 390 || width === 1440) {
            await page.screenshot({ path: path.join(output, `${name}-${lang}-${width}.png`), fullPage: true });
            await page.screenshot({ path: path.join(output, `${name}-${lang}-${width}-hero.png`) });
          }
          for (let index = 0; index < 4; index++) {
            await page.locator(`[data-explorer-select="${index}"]`).click();
            await page.waitForFunction(selected => document.querySelector(`[data-explorer-select="${selected}"]`).getAttribute('aria-pressed') === 'true', index);
            const dimensions = await page.locator('[data-explorer]').evaluate(explorer => {
              const visible = explorer.querySelector('[data-explorer-slide]:not([hidden])');
              const img = visible.querySelector('img');
              const box = explorer.getBoundingClientRect();
              return { width: document.documentElement.scrollWidth, left: box.left, right: box.right, height: box.height, loaded: img.complete && img.naturalWidth > 0 };
            });
            assert.ok(dimensions.width <= width && dimensions.left >= 0 && dimensions.right <= width, `Explorer view ${index} overflow at ${width}px`);
            assert.ok(dimensions.loaded, 'Selected view image unavailable');
            exploredViews++;
          }
          if (width === 320 || width === 1440) {
            await page.locator('[data-explorer-zoom]').click();
            const modal = await page.locator('[data-explorer-dialog]').boundingBox();
            assert.ok(modal.x >= 0 && modal.x + modal.width <= width, 'Modal horizontal overflow');
            await page.locator('[data-explorer-close]').click();
          }
          await page.locator('[data-explorer-select="0"]').click();
          await page.waitForFunction(() => document.querySelector('[data-explorer-select="0"]').getAttribute('aria-pressed') === 'true');
          await page.evaluate(() => window.scrollTo(0, 0));
        }
        assert.deepEqual(errors, [], 'Browser or local network errors');
        await context.close();
      }
    }
    for (const width of [390, 800, 1440]) {
      const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 320 } });
      const page = await context.newPage();
      await page.goto(`${base}/beauty.html`);
      const visibleSectionLinks = await page.locator('header a[href="#ritual"]:visible').count();
      assert.ok(visibleSectionLinks > 0, `No-JS navigation missing at ${width}px`);
      assert.equal(await page.locator('[data-lang]:visible').count(), 0, 'No-JS language buttons should not appear interactive');
      assert.equal(await page.locator('[data-nav]').evaluate(nav => getComputedStyle(nav).position), 'static', 'Expanded fallback must not obscure a short viewport');
      assert.equal(await page.locator('#product .rxsz-reveal').first().evaluate(el => getComputedStyle(el).opacity), '1');
      await context.close();
    }
    fs.writeFileSync(path.join(output, 'responsive-report.json'), JSON.stringify(report, null, 2));
    console.log(`PASS: ${report.length} page/language/viewport combinations, ${exploredViews} explorer views, all images and section links, plus 3 no-JS layouts.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
