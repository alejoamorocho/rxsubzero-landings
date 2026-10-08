// Run with node --test tests/explorer.cjs and Playwright available in NODE_PATH.
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
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.webp': 'image/webp' };
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
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  await page.goto(`${base}/${name}.html`, { waitUntil: 'networkidle' });
  if (options.javaScriptEnabled !== false) await page.waitForFunction(() => window.RXSZ?.t('hero.title_1'));
  return { page, context };
}

async function expectView(page, index) {
  await page.waitForFunction(index => {
    const slides = [...document.querySelectorAll('[data-explorer-slide]')];
    return slides.length === 4 && slides.every((slide, i) => slide.hidden === (i !== index));
  }, index);
  const state = await page.evaluate(() => ({
    inert: [...document.querySelectorAll('[data-explorer-slide]')].map(slide => slide.inert),
    selected: [...document.querySelectorAll('[data-explorer-select]')].map(button => button.getAttribute('aria-pressed')),
  }));
  assert.deepEqual(state.inert, [0, 1, 2, 3].map(i => i !== index));
  assert.deepEqual(state.selected, [0, 1, 2, 3].map(i => String(i === index)));
}

for (const name of ['beauty', 'health']) {
  test(`${name}: photo selection, previous and next keep one accessible view`, async () => {
    const { page, context } = await visit(name);
    try {
      assert.equal(await page.locator('[data-explorer-controls]:visible').count(), 1, 'Explorer controls should become usable');
      assert.equal(await page.locator('[data-explorer-zoom]:visible').count(), 1);
      await expectView(page, 0);
      await page.locator('[data-explorer-select="2"]').click();
      await expectView(page, 2);
      await page.locator('[data-explorer-next]').first().click();
      await expectView(page, 3);
      await page.locator('[data-explorer-next]').first().click();
      await expectView(page, 0);
      await page.locator('[data-explorer-prev]').first().click();
      await expectView(page, 3);
    } finally { await context.close(); }
  });
}

test('stage and picker support arrows, Home and End without taking vertical arrow keys', async () => {
  const { page, context } = await visit();
  try {
    const stage = page.locator('[data-explorer-stage]');
    await stage.focus();
    await page.keyboard.press('End');
    await expectView(page, 3);
    await page.keyboard.press('ArrowRight');
    await expectView(page, 0);
    await page.keyboard.press('ArrowDown');
    await expectView(page, 0);
    await page.locator('[data-explorer-select="0"]').focus();
    await page.keyboard.press('ArrowLeft');
    await expectView(page, 3);
    await page.keyboard.press('Home');
    await expectView(page, 0);
  } finally { await context.close(); }
});

test('horizontal swipes change view without taking vertical gestures', async () => {
  const { page, context } = await visit();
  try {
    const stage = page.locator('[data-explorer-stage]');
    await stage.scrollIntoViewIfNeeded();
    const box = await stage.boundingBox();
    const start = { x: box.x + box.width * .7, y: box.y + Math.min(box.height / 2, 180) };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x - 90, start.y + 5, { steps: 4 });
    await page.mouse.up();
    await expectView(page, 1);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x - 60, start.y + 100, { steps: 4 });
    await page.mouse.up();
    await expectView(page, 1);
  } finally { await context.close(); }
});

test('slow older image decode cannot overwrite a newer selection', async () => {
  const { page, context } = await visit();
  try {
    await page.evaluate(() => {
      const image = document.querySelectorAll('[data-explorer-slide] img')[1];
      const decode = image.decode.bind(image);
      image.decode = () => decode().then(() => new Promise(resolve => { window.releaseExplorerDecode = resolve; }));
    });
    await page.locator('[data-explorer-select="1"]').click();
    await page.waitForFunction(() => window.releaseExplorerDecode);
    await expectView(page, 0);
    await page.locator('[data-explorer-select="2"]').click();
    await expectView(page, 2);
    await page.evaluate(() => window.releaseExplorerDecode());
    await page.waitForTimeout(50);
    await expectView(page, 2);
  } finally { await context.close(); }
});

test('reselecting the current image cancels a pending request', async () => {
  const { page, context } = await visit();
  try {
    await page.evaluate(() => {
      const image = document.querySelectorAll('[data-explorer-slide] img')[1];
      const decode = image.decode.bind(image);
      image.decode = () => decode().then(() => new Promise(resolve => { window.releaseExplorerDecode = resolve; }));
    });
    await page.locator('[data-explorer-select="1"]').click();
    await page.waitForFunction(() => window.releaseExplorerDecode);
    await page.locator('[data-explorer-select="0"]').click();
    await page.evaluate(() => window.releaseExplorerDecode());
    await page.waitForTimeout(50);
    await expectView(page, 0);
    assert.notEqual(await page.locator('[data-explorer-stage]').getAttribute('aria-busy'), 'true');
  } finally { await context.close(); }
});

test('a completed keyboard request does not take focus back after the visitor tabs away', async () => {
  const { page, context } = await visit();
  try {
    await page.evaluate(() => {
      const image = document.querySelectorAll('[data-explorer-slide] img')[1];
      const decode = image.decode.bind(image);
      image.decode = () => decode().then(() => new Promise(resolve => { window.releaseExplorerDecode = resolve; }));
    });
    await page.locator('[data-explorer-select="0"]').focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => window.releaseExplorerDecode);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focusBeforeDecode = await page.evaluate(() => document.activeElement.getAttribute('data-explorer-select'));
    assert.ok(['2', '3'].includes(focusBeforeDecode), 'Tab should move beyond the pending picker item');
    await page.evaluate(() => window.releaseExplorerDecode());
    await expectView(page, 1);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-explorer-select')), focusBeforeDecode);
  } finally { await context.close(); }
});

test('an unavailable image retains the prior photo and announces the translated error', async () => {
  const { page, context } = await visit();
  try {
    await page.evaluate(() => {
      const image = document.querySelectorAll('[data-explorer-slide] img')[1];
      image.removeAttribute('srcset');
      image.src = '/missing-explorer-photo.webp';
    });
    await page.locator('[data-explorer-select="1"]').click();
    await page.waitForFunction(() => document.querySelector('[data-explorer-status]').textContent === RXSZ.t('explorer.load_error'));
    await expectView(page, 0);
    assert.equal(await page.locator('[data-explorer]').evaluate(el => el.hasAttribute('data-explorer-error')), true);
    await page.evaluate(() => RXSZ.setLang('es'));
    assert.equal(await page.locator('[data-explorer-status]').textContent(), await page.evaluate(() => RXSZ.t('explorer.load_error')));
    await page.locator('[data-explorer-select="3"]').click();
    await expectView(page, 3);
    assert.equal(await page.locator('[data-explorer]').evaluate(el => el.hasAttribute('data-explorer-error')), false);
  } finally { await context.close(); }
});

test('selecting a photo again retries a download that failed once', async () => {
  const { page, context } = await visit();
  try {
    let failedOnce = false;
    await page.route('**/*?explorer-retry', route => {
      if (!failedOnce) { failedOnce = true; return route.abort(); }
      return route.continue();
    });
    await page.evaluate(() => {
      const image = document.querySelectorAll('[data-explorer-slide] img')[1];
      image.removeAttribute('srcset');
      image.src += '?explorer-retry';
    });
    await page.locator('[data-explorer-select="1"]').click();
    await page.waitForFunction(() => document.querySelector('[data-explorer]').hasAttribute('data-explorer-error'));
    await expectView(page, 0);
    await page.locator('[data-explorer-select="1"]').click();
    await expectView(page, 1);
    assert.equal(await page.locator('[data-explorer]').evaluate(el => el.hasAttribute('data-explorer-error')), false);
  } finally { await context.close(); }
});

test('zoom follows selection and language, then restores focus and scrolling', async () => {
  const { page, context } = await visit('health');
  try {
    const zoom = page.locator('[data-explorer-zoom]');
    const dialog = page.locator('[data-explorer-dialog]');
    await page.evaluate(() => { document.documentElement.style.overflow = 'clip'; });
    await zoom.click();
    assert.equal(await dialog.evaluate(el => el.open), true);
    assert.equal(await page.evaluate(() => document.documentElement.style.overflow), 'hidden');
    assert.equal(await dialog.locator('[data-explorer-zoom-media] img').count(), 1);
    await page.keyboard.press('ArrowRight');
    await expectView(page, 1);
    await page.evaluate(() => RXSZ.setLang('es'));
    await page.waitForFunction(() => {
      const active = [...document.querySelectorAll('[data-explorer-slide]')].find(slide => !slide.hidden);
      const image = document.querySelector('[data-explorer-zoom-media] img');
      return image.src === active.querySelector('img').src && image.complete && image.naturalWidth > 0;
    });
    const details = await page.evaluate(() => {
      const active = [...document.querySelectorAll('[data-explorer-slide]')].find(slide => !slide.hidden);
      const clone = document.querySelector('[data-explorer-zoom-media] img');
      return {
        source: active.querySelector('img').src,
        zoom: clone.src,
        sourceAlt: active.querySelector('img').alt,
        zoomAlt: clone.alt,
        caption: active.querySelector('[data-explorer-caption]').textContent.trim(),
        dialogText: document.querySelector('[data-explorer-dialog]').textContent,
        title: document.querySelector('[data-explorer-dialog-title]').textContent.trim(),
        name: document.querySelector('[data-explorer-select="1"]').textContent.trim(),
        cloneBindings: clone.getAttributeNames().filter(name => name === 'id' || name.startsWith('data-i18n')),
        status: document.querySelector('[data-explorer-status]').textContent,
      };
    });
    assert.equal(details.zoom, details.source);
    assert.equal(details.zoomAlt, details.sourceAlt);
    assert.equal(details.title, details.name);
    assert.ok(details.dialogText.includes(details.caption));
    assert.ok(details.status.includes(details.name));
    assert.deepEqual(details.cloneBindings, []);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[data-explorer-dialog]').open);
    assert.equal(await zoom.evaluate(el => document.activeElement === el), true);
    assert.equal(await page.evaluate(() => document.documentElement.style.overflow), 'clip');
    assert.equal(await dialog.locator('[data-explorer-zoom-media] img').count(), 0);
  } finally { await context.close(); }
});

test('zoom retains the decoded responsive photo if its larger version fails', async () => {
  const { page, context } = await visit('beauty', { deviceScaleFactor: 1 });
  try {
    const source = await page.locator('[data-explorer-slide]').first().locator('img').evaluate(async image => {
      await image.decode();
      return { displayed: image.currentSrc, full: image.src };
    });
    assert.notEqual(source.displayed, source.full, 'Mobile should already display the smaller photo');
    let receivedFull;
    const attempted = new Promise(resolve => { receivedFull = resolve; });
    await page.route(source.full, route => { receivedFull(); return route.abort(); });
    await page.locator('[data-explorer-zoom]').click();
    await attempted;
    await page.waitForFunction(() => document.querySelector('[data-explorer-zoom-media] img').complete);
    const displayed = page.locator('[data-explorer-zoom-media] img');
    assert.equal(await displayed.evaluate(image => image.naturalWidth > 0), true, 'Zoom should retain a usable photo');
    assert.equal(await displayed.getAttribute('src'), source.displayed);
    const warning = page.locator('[data-explorer-dialog]').getByRole('status');
    await page.waitForFunction(() => document.querySelector('[data-explorer-dialog-status]').textContent === RXSZ.t('explorer.zoom_error'));
    assert.equal(await warning.textContent(), await page.evaluate(() => RXSZ.t('explorer.zoom_error')));
    assert.equal(await page.locator('[data-explorer]').evaluate(el => el.hasAttribute('data-explorer-error')), false);
    await page.evaluate(() => RXSZ.setLang('es'));
    assert.equal(await warning.textContent(), await page.evaluate(() => RXSZ.t('explorer.zoom_error')));
    await expectView(page, 0);
  } finally { await context.close(); }
});

test('a slow full-size zoom download cannot replace a newer photo', async () => {
  const { page, context } = await visit('beauty', { deviceScaleFactor: 1 });
  try {
    const source = await page.locator('[data-explorer-slide]').first().locator('img').evaluate(image => ({ displayed: image.currentSrc, full: image.src }));
    let release, received;
    const attempted = new Promise(resolve => { received = resolve; });
    await page.route(source.full, route => { release = () => route.continue(); received(); });
    await page.locator('[data-explorer-zoom]').click();
    await attempted;
    assert.equal(await page.locator('[data-explorer-zoom-media] img').getAttribute('src'), source.displayed);
    await page.keyboard.press('End');
    await expectView(page, 3);
    const latest = await page.locator('[data-explorer-slide]').nth(3).locator('img').getAttribute('src');
    const response = page.waitForResponse(source.full);
    await release();
    await response;
    await page.waitForTimeout(50);
    assert.equal(new URL(await page.locator('[data-explorer-zoom-media] img').getAttribute('src'), base).pathname, new URL(latest, base).pathname);
    assert.equal(await page.locator('[data-explorer-dialog]').getByRole('status').count(), 0);
    await expectView(page, 3);
  } finally { await context.close(); }
});

test('closing zoom cancels its pending upgrade without restoring modal content later', async () => {
  const { page, context } = await visit('beauty', { deviceScaleFactor: 1 });
  try {
    const full = await page.locator('[data-explorer-slide]').first().locator('img').evaluate(image => image.src);
    let release, received;
    const attempted = new Promise(resolve => { received = resolve; });
    await page.route(full, route => { release = () => route.continue(); received(); });
    await page.locator('[data-explorer-zoom]').click();
    await attempted;
    await page.keyboard.press('Escape');
    const response = page.waitForResponse(full);
    await release();
    await response;
    await page.waitForTimeout(50);
    assert.equal(await page.locator('[data-explorer-zoom-media] img').count(), 0);
    assert.equal(await page.locator('[data-explorer-dialog]').evaluate(dialog => dialog.open), false);
    assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
  } finally { await context.close(); }
});

test('a failed photo change is announced inside the open modal and clears after recovery', async () => {
  const { page, context } = await visit('health');
  try {
    await page.evaluate(() => {
      const image = document.querySelectorAll('[data-explorer-slide] img')[1];
      image.removeAttribute('srcset');
      image.src = '/missing-dialog-photo.webp';
    });
    await page.locator('[data-explorer-zoom]').click();
    const dialog = page.locator('[data-explorer-dialog]');
    await dialog.locator('[data-explorer-next]').click();
    await page.waitForFunction(() => document.querySelector('[data-explorer]').hasAttribute('data-explorer-error'));
    assert.equal(await dialog.getByRole('status').count(), 1, 'An open modal needs its own accessible failure message');
    assert.equal(await dialog.getByRole('status').textContent(), await page.evaluate(() => RXSZ.t('explorer.load_error')));
    await expectView(page, 0);
    await page.keyboard.press('End');
    await expectView(page, 3);
    assert.equal(await dialog.getByRole('status').count(), 0);
    assert.equal(await dialog.locator('[data-explorer-zoom-media] img').evaluate(image => image.naturalWidth > 0), true);
  } finally { await context.close(); }
});

test('without JavaScript the lead photo remains visible and controls remain hidden', async () => {
  const { page, context } = await visit('beauty', { javaScriptEnabled: false });
  try {
    assert.equal(await page.locator('[data-explorer-slide]:visible').count(), 1);
    assert.equal(await page.locator('[data-explorer-controls]:visible').count(), 0);
    assert.equal(await page.locator('[data-explorer-zoom]:visible').count(), 0);
    assert.equal(await page.locator('[data-explorer-slide]').first().locator('img').evaluate(image => image.complete && image.naturalWidth > 0), true);
  } finally { await context.close(); }
});
