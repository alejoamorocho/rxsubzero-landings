// Run with Node's test runner and Playwright available through NODE_PATH.
// Optional: CHROME_PATH selects a local Chromium executable.
const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
let browser, server, base;

before(async () => {
  server = http.createServer((request, response) => {
    const filename = path.resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
    if (!filename.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(filename, (error, data) => {
      if (error) { response.writeHead(404).end(); return; }
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
      response.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
      response.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH, headless: true }
    : { channel: 'chrome', headless: true });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function visit(name = 'beauty', options = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  // Font service availability is unrelated to these interaction regressions.
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  await page.goto(`${base}/${name}.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.RXSZ && window.RXSZ.t('hero.title_1'));
  return { page, context };
}

test('the latest language choice wins when responses arrive out of order', async () => {
  const { page, context } = await visit();
  try {
    let release;
    let received;
    const intercepted = new Promise(resolve => { received = resolve; });
    await page.route('**/beauty.es.json', route => { release = () => route.continue(); received(); });
    await page.evaluate(() => { window.pendingSpanish = RXSZ.setLang('es'); });
    await intercepted;
    await page.evaluate(() => RXSZ.setLang('en'));
    await release();
    await page.evaluate(() => window.pendingSpanish);
    assert.equal(await page.getAttribute('html', 'lang'), 'en');
    assert.equal(await page.evaluate(() => RXSZ.getLang()), 'en');
    assert.equal(await page.locator('[data-lang="en"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => localStorage.getItem('rxsz-lang')), 'en');
  } finally { await context.close(); }
});

test('a failed language fetch preserves applied content, metadata, and preference', async () => {
  const { page, context } = await visit();
  try {
    await page.evaluate(() => RXSZ.setLang('es'));
    const title = await page.title();
    await page.route('**/beauty.en.json', route => route.abort());
    await page.evaluate(() => RXSZ.setLang('en'));
    assert.equal(await page.getAttribute('html', 'lang'), 'es');
    assert.equal(await page.evaluate(() => RXSZ.getLang()), 'es');
    assert.equal(await page.title(), title);
    assert.equal(await page.evaluate(() => localStorage.getItem('rxsz-lang')), 'es');
    assert.ok(await page.evaluate(() => RXSZ.t('hero.title_1')));
    assert.ok((await page.locator('[data-language-status]').textContent()).length);
  } finally { await context.close(); }
});

test('an incomplete dictionary cannot produce a page containing two languages', async () => {
  const { page, context } = await visit();
  try {
    await page.route('**/beauty.es.json', route => route.fulfill({ json: { hero: { title_1: 'Solo una traducción' } } }));
    await page.evaluate(() => RXSZ.setLang('es'));
    assert.equal(await page.getAttribute('html', 'lang'), 'en');
    assert.notEqual(await page.locator('[data-i18n="hero.title_1"]').textContent(), 'Solo una traducción');
    assert.ok(await page.evaluate(() => RXSZ.t('hero.title_1')));
  } finally { await context.close(); }
});

test('an unavailable saved language leaves the authored language truthful and can be retried', async () => {
  const { page, context } = await visit('health');
  try {
    const heading = await page.locator('h1').textContent();
    await page.evaluate(() => localStorage.setItem('rxsz-lang', 'es'));
    await page.route('**/health.es.json', route => route.abort());
    await page.goto(`${base}/health.html`, { waitUntil: 'networkidle' });
    assert.equal(await page.getAttribute('html', 'lang'), 'en');
    assert.equal(await page.evaluate(() => RXSZ.getLang()), 'en');
    assert.equal(await page.locator('h1').textContent(), heading);
    assert.equal(await page.locator('[data-lang="en"]').getAttribute('aria-pressed'), 'true');
    await page.unroute('**/health.es.json');
    await page.evaluate(() => RXSZ.setLang('es'));
    assert.equal(await page.getAttribute('html', 'lang'), 'es');
    assert.equal(await page.locator('[data-language-status]').textContent(), '');
  } finally { await context.close(); }
});

test('URL language overrides saved preference and survives changing landing pages', async () => {
  const { page, context } = await visit();
  try {
    await page.goto(`${base}/beauty.html?lang=es`, { waitUntil: 'networkidle' });
    assert.equal(await page.getAttribute('html', 'lang'), 'es');
    const link = page.locator('[data-page-link][href*="health.html"]').last();
    assert.match(await link.getAttribute('href'), /lang=es/);
    await link.click();
    await page.waitForURL('**/health.html?lang=es');
    await page.waitForFunction(() => document.documentElement.lang === 'es');
    await page.evaluate(() => RXSZ.setLang('en'));
    assert.equal(new URL(page.url()).searchParams.get('lang'), 'en');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.getAttribute('html', 'lang'), 'en');
  } finally { await context.close(); }
});

test('mobile menu updates its accessible action and closes on Escape and desktop resize', async () => {
  const { page, context } = await visit();
  try {
    const toggle = page.locator('[data-nav-toggle]');
    await toggle.click();
    assert.match(await toggle.getAttribute('aria-label'), /close/i);
    await page.keyboard.press('Escape');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await toggle.evaluate(el => document.activeElement === el), true);
    await toggle.click();
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.waitForFunction(() => document.querySelector('[data-nav-toggle]').getAttribute('aria-expanded') === 'false');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator('[data-nav-drawer]').isVisible(), false);
  } finally { await context.close(); }
});

test('choosing an in-page mobile link closes the menu and focuses the uncovered destination', async () => {
  const { page, context } = await visit();
  try {
    await page.locator('[data-nav-toggle]').click();
    await page.locator('[data-nav-drawer] a[href="#ritual"]').click();
    await page.waitForFunction(() => location.hash === '#ritual' && document.activeElement.id === 'ritual');
    assert.equal(await page.locator('[data-nav-toggle]').getAttribute('aria-expanded'), 'false');
    await page.waitForFunction(() => {
      const target = document.getElementById('ritual').getBoundingClientRect();
      const header = document.querySelector('[data-nav]').getBoundingClientRect();
      return target.top >= header.bottom - 1 && target.top < header.bottom + 40;
    });
  } finally { await context.close(); }
});

test('rapidly reopening an FAQ cannot leave an expanded answer hidden', async () => {
  const { page, context } = await visit();
  try {
    const trigger = page.locator('.rxsz-faq__q').first();
    await trigger.scrollIntoViewIfNeeded();
    await page.evaluate(async () => {
      const button = document.querySelector('.rxsz-faq__q');
      button.click();
      await new Promise(resolve => setTimeout(resolve, 70));
      button.click();
    });
    await page.waitForTimeout(420);
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
    const panel = page.locator('#' + await trigger.getAttribute('aria-controls'));
    assert.equal(await panel.isVisible(), true);
    assert.ok(await panel.evaluate(el => el.getBoundingClientRect().height >= el.scrollHeight - 1));
  } finally { await context.close(); }
});

test('mobile purchase bar leaves focus order when hidden and clears the offer and footer', async () => {
  const { page, context } = await visit();
  try {
    const bar = page.locator('[data-purchase-bar]');
    assert.equal(await bar.getAttribute('aria-hidden'), 'true');
    assert.equal(await bar.evaluate(el => el.inert), true);
    await page.locator('#benefits').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-purchase-bar]').classList.contains('is-visible'));
    assert.equal(await bar.getAttribute('aria-hidden'), 'false');
    await page.locator('#offer').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.querySelector('[data-purchase-bar]').classList.contains('is-visible'));
    assert.equal(await bar.evaluate(el => el.inert), true);
    await page.locator('footer').scrollIntoViewIfNeeded();
    assert.equal(await bar.getAttribute('aria-hidden'), 'true');
  } finally { await context.close(); }
});

test('configured checkout hides the unavailable notice and restores it when checkout is removed', async () => {
  const { page, context } = await visit();
  try {
    const note = page.locator('[data-purchase-availability]');
    const checkout = page.locator('[data-purchase-action="checkout"]').first();
    assert.equal(await note.isVisible(), true);
    await page.evaluate(() => {
      window.RXSZ_CONFIG = { purchaseUrl: 'https://example.com/checkout', currency: 'USD', referencePrice: '49.90' };
      return RXSZ.setLang('es');
    });
    assert.equal(await note.isVisible(), false);
    assert.equal(await checkout.getAttribute('href'), 'https://example.com/checkout');
    assert.equal(await checkout.getAttribute('aria-disabled'), null);
    await page.evaluate(() => {
      window.RXSZ_CONFIG = { purchaseUrl: '' };
      return RXSZ.setLang('en');
    });
    assert.equal(await note.isVisible(), true);
    assert.equal(await checkout.getAttribute('href'), null);
    assert.equal(await checkout.getAttribute('aria-disabled'), 'true');
  } finally { await context.close(); }
});

test('checkout rejects invalid destinations and keeps the pending state visible', async () => {
  const { page, context } = await visit();
  try {
    for (const purchaseUrl of ['', '   ', 'not-a-url', '/products/rx', 'http://example.com/cart', 'javascript:void(0)', 'https://', 'https:shop.example.com/products/rx', 'https:/shop.example.com/products/rx', 'https://user:password@example.com/products/rx']) {
      await page.evaluate(purchaseUrl => {
        window.RXSZ_CONFIG = { purchaseUrl };
        return RXSZ.setLang('es');
      }, purchaseUrl);
      const checkout = page.locator('[data-purchase-action="checkout"]');
      assert.equal(await checkout.getAttribute('href'), null, purchaseUrl);
      assert.equal(await checkout.getAttribute('aria-disabled'), 'true', purchaseUrl);
      assert.equal(await page.locator('[data-purchase-availability]').isVisible(), true, purchaseUrl);
    }
  } finally { await context.close(); }
});

test('checkout preserves its exact destination and ready label after translation and hydration', async () => {
  const { page, context } = await visit();
  const purchaseUrl = 'https://shop.example.com/products/rx-subzero?variant=123&selling_plan=456';
  try {
    await page.evaluate(purchaseUrl => { window.RXSZ_CONFIG = { purchaseUrl }; }, purchaseUrl);
    for (const lang of ['es', 'en']) {
      await page.evaluate(lang => RXSZ.setLang(lang), lang);
      await page.evaluate(() => RXSZ.hydrate(document.querySelector('#offer')));
      assert.equal(await page.locator('[data-purchase-label]').textContent(), await page.evaluate(() => RXSZ.t('purchase.buy')));
      assert.equal(await page.locator('[data-purchase-action="checkout"]').getAttribute('href'), purchaseUrl);
    }
    await page.route('https://shop.example.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Shop destination</h1>' }));
    await page.locator('[data-purchase-action="checkout"]').click();
    await page.waitForURL(purchaseUrl);
  } finally { await context.close(); }
});

for (const name of ['beauty', 'health']) {
  test(`${name}: acquisition actions keep visitors in the purchase journey in both languages`, async () => {
    const { page, context } = await visit(name, { reducedMotion: 'reduce' });
    try {
      for (const lang of ['es', 'en']) {
        await page.evaluate(lang => RXSZ.setLang(lang), lang);
        for (const selector of ['#top [data-purchase-action="scroll"]', '#final .rxsz-btn']) {
          await page.locator(selector).click();
          assert.equal(new URL(page.url()).hash, '#offer');
          assert.equal(await page.evaluate(() => document.activeElement.id), 'offer');
          assert.equal(new URL(page.url()).pathname, `/${name}.html`);
          const position = await page.evaluate(() => ({ offer: document.querySelector('#offer').getBoundingClientRect().top, header: document.querySelector('[data-nav]').getBoundingClientRect().bottom }));
          assert.ok(position.offer >= position.header, 'offer clears the fixed header');
        }
        await page.locator('[data-nav-toggle]').click();
        await page.locator('[data-nav-drawer] .rxsz-btn').click();
        assert.equal(await page.evaluate(() => document.activeElement.id), 'offer');
        assert.equal(await page.locator('[data-nav-toggle]').getAttribute('aria-expanded'), 'false');
      }
    } finally { await context.close(); }
  });
}

for (const name of ['beauty', 'health']) {
  test(`${name}: switching both languages updates every authored translation binding`, async () => {
    const { page, context } = await visit(name);
    try {
      for (const lang of ['es', 'en']) {
        await page.evaluate(lang => RXSZ.setLang(lang), lang);
        const mismatches = await page.evaluate(() => {
          const missing = [];
          document.querySelectorAll('[data-i18n]').forEach(el => {
            if (el.closest('[data-purchase-action="checkout"]')) return;
            if (el.textContent !== RXSZ.t(el.dataset.i18n)) missing.push(el.dataset.i18n);
          });
          document.querySelectorAll('[data-i18n-attr]').forEach(el => {
            if (el.matches('[data-nav-toggle]')) return;
            el.dataset.i18nAttr.split(';').forEach(pair => {
              const colon = pair.indexOf(':');
              const attr = pair.slice(0, colon).trim(), key = pair.slice(colon + 1).trim();
              if (el.getAttribute(attr) !== RXSZ.t(key)) missing.push(key);
            });
          });
          return missing;
        });
        assert.deepEqual(mismatches, []);
      }
    } finally { await context.close(); }
  });
}
