// Run with node --test tests/commerce.cjs and Playwright available in NODE_PATH.
// Shopify requests below are intercepted locally; no payment or live store is used.
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
  if (server) await new Promise(resolve => {
    server.close(resolve);
    server.closeIdleConnections?.();
    server.closeAllConnections?.();
  });
});

const clone = value => JSON.parse(JSON.stringify(value));
const cents = text => Number(text.replace(/[^\d]/g, ''));

test('opening and closing the product preserves the offer position and page URL', async () => {
  const { page, context } = await visit('beauty', { reducedMotion: 'reduce' });
  try {
    const opener = page.locator('[data-purchase-action="checkout"]');
    await opener.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => ({ top: scrollY, url: location.href }));
    await opener.click();
    await page.waitForFunction(() => document.querySelector('[data-buy-dialog]').open);
    assert.equal(page.url(), before.url, 'Opening a panel does not navigate to a section');
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - before.top) <= 1, 'Offer remains in place behind the panel');
    await page.locator('[data-buy-close]').click();
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - before.top) <= 1, 'Closing returns to the same place');
  } finally { await context.close(); }
});

test('Shopify other cart products do not inherit the selected product quantity limits', async () => {
  const { page, context, api } = await visit('beauty', { shopify: true, initialItems: [makeLine(201, '201:other', 7, 1200, 'Existing product')] });
  try {
    await waitCount(page, 7);
    await page.locator('[data-cart-open]').first().click();
    await waitCart(page);
    const increase = page.locator('[data-cart-line="201:other"] [data-cart-increase]');
    assert.equal(await increase.isEnabled(), true, 'RX SUBZERO max five does not apply to another product');
    await increase.click();
    await waitCount(page, 8);
    assert.deepEqual(api.changes.at(-1), { id: '201:other', quantity: 8 });
  } finally { await context.close(); }
});

async function requestReceived(promise) {
  let timer;
  try {
    await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Expected cart mutation did not reach the local API')), 5000); })
    ]);
  } finally { clearTimeout(timer); }
}

function makeLine(id, key, quantity, price, title = 'RX SUBZERO') {
  return {
    id, variant_id: id, key, quantity, title, product_title: title,
    variant_title: id === 101 ? 'Blue' : 'Default Title',
    price, original_price: price, final_price: price,
    line_price: price * quantity, original_line_price: price * quantity,
    final_line_price: price * quantity, total_discount: 0,
    image: '/assets/img/beauty-product-authentic.webp',
    featured_image: { url: '/assets/img/beauty-product-authentic.webp', alt: title, aspect_ratio: 1.2 },
    url: '/products/rx-subzero', handle: 'rx-subzero',
    properties: {}, discounts: [], line_level_discount_allocations: [], requires_shipping: true
  };
}

function cartFromItems(items) {
  const total = items.reduce((sum, item) => sum + item.final_line_price, 0);
  const original = items.reduce((sum, item) => sum + item.original_line_price, 0);
  return {
    token: 'local-test-cart', attributes: {}, currency: 'USD', note: '',
    item_count: items.reduce((sum, item) => sum + item.quantity, 0),
    items_subtotal_price: total, total_price: total, original_total_price: original,
    total_discount: original - total, total_weight: 0,
    requires_shipping: !!items.length, cart_level_discount_applications: [], items
  };
}

async function installShopify(page, initialItems = [makeLine(201, '201:other', 1, 1200, 'Existing product')]) {
  const config = {
    purchaseUrl: '', referencePrice: '49.90', currency: 'USD',
    commerce: {
      mode: 'shopify', root: '/es/', cartUrl: '/es/cart', checkoutUrl: '/es/checkout', currency: 'USD',
      product: {
        title: 'RX SUBZERO', handle: 'rx-subzero', has_only_default_variant: false,
        variants: [
          { id: 101, title: 'Blue', price: 4990, available: true, quantity_rule: { min: 1, increment: 1, max: 5 } },
          { id: 102, title: 'White', price: 5990, available: false, quantity_rule: { min: 1, increment: 1, max: 5 } }
        ],
        images: [{ src: '/assets/img/beauty-product-authentic.webp', alt: 'Product' }]
      },
      policies: []
    }
  };
  const api = { config, items: clone(initialItems), adds: [], changes: [], reads: 0, addReply: null, changeReply: null, readReply: null };
  api.cart = () => cartFromItems(clone(api.items));
  api.add = payload => {
    const entry = payload.items ? payload.items[0] : payload;
    const variant = config.commerce.product.variants.find(item => String(item.id) === String(entry.id));
    if (!variant) throw new Error(`Unexpected variant ${entry.id}`);
    let line = api.items.find(item => item.variant_id === variant.id && item.key === `${variant.id}:rxsz`);
    if (!line) { line = makeLine(variant.id, `${variant.id}:rxsz`, 0, variant.price); api.items.push(line); }
    line.quantity += Number(entry.quantity);
    line.line_price = line.original_line_price = line.final_line_price = line.price * line.quantity;
    return clone(line);
  };
  api.change = payload => {
    const index = api.items.findIndex(item => item.key === String(payload.id));
    if (index < 0) throw new Error(`Expected a line key, received ${payload.id}`);
    const quantity = Number(payload.quantity);
    if (!quantity) api.items.splice(index, 1);
    else {
      const line = api.items[index];
      line.quantity = quantity;
      line.line_price = line.original_line_price = line.final_line_price = line.price * quantity;
    }
    return api.cart();
  };
  await page.route('**/assets/js/config.js', route => route.fulfill({
    status: 200, contentType: 'text/javascript',
    body: `window.RXSZ_CONFIG = ${JSON.stringify(config)}; window.Shopify = { routes: { root: '/es/' } };`
  }));
  await page.route(url => /^\/es\/cart(?:\/(?:add|change))?\.js$/.test(url.pathname), async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/es/cart.js') {
      api.reads++;
      if (api.readReply) return api.readReply(route, api.reads);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(api.cart()) });
      return;
    }
    const payload = request.postDataJSON();
    if (pathname === '/es/cart/add.js') {
      api.adds.push(clone(payload));
      if (api.addReply) return api.addReply(payload, route);
      const line = api.add(payload);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [line] }) });
    } else {
      api.changes.push(clone(payload));
      if (api.changeReply) return api.changeReply(payload, route);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(api.change(payload)) });
    }
  });
  return api;
}

async function visit(name = 'beauty', { shopify = false, initialItems, setup, documentPath, ...options } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  const api = shopify ? await installShopify(page, initialItems) : null;
  if (setup) await setup(page, api);
  await page.goto(base + (documentPath || `/${name}.html?lang=en`), { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.RXSZ?.t('hero.title_1'));
  return { page, context, api };
}

async function openBuy(page) {
  const dialog = page.locator('[data-buy-dialog]');
  assert.equal(await dialog.count(), 1, 'A product purchase dialog must exist');
  assert.equal(await dialog.evaluate(element => element.tagName), 'DIALOG');
  await page.locator('[data-purchase-action="checkout"]').first().click();
  await page.waitForFunction(() => document.querySelector('[data-buy-dialog]')?.open === true);
  return dialog;
}

async function waitCart(page) {
  await page.waitForFunction(() => document.querySelector('[data-cart-dialog]')?.open === true);
  return page.locator('[data-cart-dialog]');
}

async function waitCount(page, count) {
  await page.waitForFunction(count => Number(document.querySelector('[data-cart-count]')?.textContent) === count, count);
}

for (const name of ['beauty', 'health']) {
  test(`${name}: demo product selection adds the chosen quantity without a store request or an enabled payment`, async () => {
    const { page, context } = await visit(name);
    const mutations = [];
    page.on('request', request => { if (request.method() !== 'GET') mutations.push(request.url()); });
    try {
      const dialog = await openBuy(page);
      assert.equal(await dialog.locator('[data-commerce-demo]').first().isVisible(), true);
      assert.equal(await page.locator('[data-buy-gallery-select]').count(), 4);
      await page.locator('[data-buy-increase]').click();
      assert.equal(await page.locator('[data-buy-quantity]').inputValue(), '2');
      await page.locator('[data-buy-add]').click();
      const cart = await waitCart(page);
      await waitCount(page, 2);
      assert.equal(await dialog.evaluate(element => element.open), false);
      assert.equal(await cart.locator('[data-cart-line]').count(), 1);
      assert.equal(cents(await page.locator('[data-cart-total]').textContent()), 9980);
      assert.equal(await cart.locator('[data-commerce-demo]').first().isVisible(), true);
      assert.equal(await page.locator('[data-cart-checkout]').getAttribute('aria-disabled'), 'true');
      assert.equal(await page.locator('[data-cart-checkout]').getAttribute('href'), null);
      assert.deepEqual(mutations, [], 'The demonstration must not call a live cart or payment service');
      assert.ok(await page.evaluate(() => localStorage.getItem('rxsz-demo-cart-v1')), 'Demo cart is stored separately from a real Shopify cart');
    } finally { await context.close(); }
  });
}

test('purchase gallery, quantity and keyboard focus survive translation and return to the opening action', async () => {
  const { page, context } = await visit();
  try {
    const opener = page.locator('[data-purchase-action="checkout"]').first();
    const dialog = await openBuy(page);
    await page.locator('[data-buy-close]').focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('[data-buy-dialog]')), true, 'Modal keyboard focus stays inside');
    await page.locator('[data-buy-gallery-select="3"]').click();
    await page.waitForFunction(() => {
      const image = document.querySelector('[data-buy-image]');
      return document.querySelector('[data-buy-gallery-select="3"]')?.getAttribute('aria-pressed') === 'true' && image?.complete && image.naturalWidth > 0;
    });
    const source = await page.locator('[data-buy-image]').getAttribute('src');
    await page.locator('[data-buy-quantity]').fill('3');
    await page.locator('[data-buy-quantity]').dispatchEvent('change');
    const english = await page.locator('[data-buy-add]').textContent();
    await page.evaluate(() => RXSZ.setLang('es'));
    assert.equal(await page.locator('[data-buy-quantity]').inputValue(), '3');
    assert.equal(await page.locator('[data-buy-image]').getAttribute('src'), source);
    assert.equal(await page.locator('[data-buy-gallery-select="3"]').getAttribute('aria-pressed'), 'true');
    assert.notEqual(await page.locator('[data-buy-add]').textContent(), english);
    assert.equal(await dialog.evaluate(element => element.open), true);
    await page.keyboard.press('Escape');
    assert.equal(await dialog.evaluate(element => element.open), false);
    assert.equal(await opener.evaluate(element => element === document.activeElement), true);
  } finally { await context.close(); }
});

test('demo cart is shared between the two landings, restores after reload and can return to its empty state', async () => {
  const { page, context } = await visit();
  try {
    await openBuy(page);
    await page.locator('[data-buy-add]').click();
    await waitCart(page);
    await page.locator('[data-cart-close]').first().click();
    await page.goto(`${base}/health.html?lang=es`, { waitUntil: 'networkidle' });
    await waitCount(page, 1);
    await page.locator('[data-cart-open]').first().click();
    await waitCart(page);
    assert.equal(await page.locator('[data-cart-line]').count(), 1);
    await page.reload({ waitUntil: 'networkidle' });
    await waitCount(page, 1);
    await page.locator('[data-cart-open]').first().click();
    await waitCart(page);
    await page.locator('[data-cart-remove]').click();
    await waitCount(page, 0);
    assert.equal(await page.locator('[data-cart-line]').count(), 0);
    assert.equal(await page.locator('[data-cart-empty]').isVisible(), true);
    assert.equal(await page.locator('[data-cart-checkout]').getAttribute('href'), null);
    await page.locator('[data-cart-close]').first().click();
    assert.equal(await page.locator('[data-cart-open]').first().evaluate(element => element === document.activeElement), true);
  } finally { await context.close(); }
});

test('Shopify product variants use real prices, unavailable states and server quantity rules', async () => {
  const { page, context, api } = await visit('beauty', { shopify: true });
  try {
    await openBuy(page);
    const variant = page.locator('[data-buy-variant]');
    assert.equal(await variant.isVisible(), true);
    assert.equal(await variant.inputValue(), '101');
    assert.equal(cents(await page.locator('[data-buy-price]').textContent()), 4990);
    await page.locator('[data-buy-decrease]').click({ force: true });
    assert.equal(await page.locator('[data-buy-quantity]').inputValue(), '1');
    for (let i = 0; i < 8; i++) await page.locator('[data-buy-increase]').click({ force: true });
    assert.equal(await page.locator('[data-buy-quantity]').inputValue(), '5');
    await variant.selectOption('102');
    assert.equal(cents(await page.locator('[data-buy-price]').textContent()), 5990);
    assert.equal(await page.locator('[data-buy-add]').isDisabled(), true);
    assert.equal(await page.locator('[data-buy-quantity]').getAttribute('max'), '5');
    assert.equal(await page.locator('[data-buy-variant] option[value="102"]').count(), 1);
    await page.evaluate(() => RXSZ.setLang('es'));
    assert.equal(await page.locator('[data-buy-add]').isDisabled(), true, 'Language changes cannot make a sold-out variant purchasable');
    await variant.selectOption('101');
    assert.equal(cents(await page.locator('[data-buy-price]').textContent()), 4990);
    assert.equal(await page.locator('[data-buy-add]').isEnabled(), true);
    assert.deepEqual(api.adds, []);
  } finally { await context.close(); }
});

test('Shopify adding a selected variant refreshes the complete cart and keeps existing products', async () => {
  const { page, context, api } = await visit('health', { shopify: true });
  try {
    await openBuy(page);
    await page.locator('[data-buy-quantity]').fill('2');
    await page.locator('[data-buy-add]').click();
    await waitCart(page);
    await waitCount(page, 3);
    assert.equal(api.adds.length, 1);
    const entry = api.adds[0].items ? api.adds[0].items[0] : api.adds[0];
    assert.equal(String(entry.id), '101');
    assert.equal(Number(entry.quantity), 2);
    assert.ok(api.reads >= 2, 'Adding a line must refresh the complete server cart');
    assert.equal(await page.locator('[data-cart-line]').count(), 2);
    assert.equal(await page.locator('[data-cart-line="201:other"]').count(), 1);
    assert.equal(cents(await page.locator('[data-cart-total]').textContent()), api.cart().total_price);
    assert.equal(await page.locator('[data-cart-checkout]').getAttribute('href'), '/es/checkout');
    assert.notEqual(await page.locator('[data-cart-checkout]').getAttribute('aria-disabled'), 'true');
    assert.equal(await page.locator('[data-cart-dialog] [data-commerce-demo]:visible').count(), 0);
  } finally { await context.close(); }
});

test('Shopify removal targets a line key, preserves other copies and uses server totals before native checkout', async () => {
  const first = makeLine(101, '101:first', 1, 4990);
  const second = makeLine(101, '101:gift', 2, 4990);
  second.properties = { Gift: 'Yes' };
  second.final_line_price = 9000;
  second.final_price = 4500;
  second.total_discount = 980;
  const other = makeLine(201, '201:other', 1, 1200, 'Existing product');
  const { page, context, api } = await visit('beauty', { shopify: true, initialItems: [first, second, other] });
  try {
    await page.locator('[data-cart-open]').first().click();
    await waitCart(page);
    await page.locator('[data-cart-line="101:first"] [data-cart-remove]').click();
    await waitCount(page, 3);
    assert.equal(api.changes.length, 1);
    assert.equal(api.changes[0].id, '101:first');
    assert.equal(Number(api.changes[0].quantity), 0);
    assert.equal(await page.locator('[data-cart-line="101:first"]').count(), 0);
    assert.equal(await page.locator('[data-cart-line="101:gift"]').count(), 1);
    assert.equal(await page.locator('[data-cart-line="201:other"]').count(), 1);
    assert.equal(cents(await page.locator('[data-cart-total]').textContent()), 10200, 'Discounted server money fields determine the total');
    await page.evaluate(() => RXSZ.setLang('es'));
    assert.equal(cents(await page.locator('[data-cart-total]').textContent()), 10200);
    await page.route('**/es/checkout', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Local checkout placeholder</h1>' }));
    await page.locator('[data-cart-checkout]').click();
    await page.waitForURL(`${base}/es/checkout`);
    assert.equal(api.adds.length, 0, 'Going to checkout must not add the product again');
  } finally { await context.close(); }
});

test('Shopify mutations disable repeated additions and cart changes while a request is pending', async () => {
  const { page, context, api } = await visit('beauty', { shopify: true });
  let releaseAdd, releaseChange;
  try {
    let receiveAdd, receiveChange;
    const addReceived = new Promise(resolve => { receiveAdd = resolve; });
    const changeReceived = new Promise(resolve => { receiveChange = resolve; });
    api.addReply = async (payload, route) => {
      await new Promise(resolve => { releaseAdd = resolve; receiveAdd(); });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [api.add(payload)] }) });
    };
    await openBuy(page);
    await page.locator('[data-buy-add]').evaluate(button => { button.click(); button.click(); });
    await requestReceived(addReceived);
    await page.waitForFunction(() => document.querySelector('[data-buy-add]')?.disabled === true);
    assert.equal(api.adds.length, 1);
    assert.equal(typeof releaseAdd, 'function');
    releaseAdd();
    await waitCart(page);
    api.changeReply = async (payload, route) => {
      await new Promise(resolve => { releaseChange = resolve; receiveChange(); });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(api.change(payload)) });
    };
    const increase = page.locator('[data-cart-line="101:rxsz"] [data-cart-increase]');
    await increase.evaluate(button => { button.click(); button.click(); });
    await requestReceived(changeReceived);
    await page.waitForFunction(() => document.querySelector('[data-cart-line="101:rxsz"] [data-cart-increase]')?.disabled === true);
    assert.equal(api.changes.length, 1);
    assert.equal(api.changes[0].id, '101:rxsz');
    releaseChange();
    await waitCount(page, 3);
    assert.equal(await increase.isEnabled(), true);
  } finally {
    if (releaseAdd) releaseAdd();
    if (releaseChange) releaseChange();
    await context.close();
  }
});

test('Shopify a partial stock error refreshes the cart, gives a translated error and never retries the mutation automatically', async () => {
  const { page, context, api } = await visit('beauty', { shopify: true });
  try {
    api.addReply = async (payload, route) => {
      const partial = clone(payload);
      if (partial.items) partial.items[0].quantity = 2;
      else partial.quantity = 2;
      api.add(partial);
      await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ status: 422, message: 'Cart Error', description: 'RAW INVENTORY MESSAGE' }) });
    };
    await openBuy(page);
    await page.locator('[data-buy-quantity]').fill('4');
    await page.locator('[data-buy-add]').click();
    await waitCount(page, 3);
    const status = page.locator('[data-buy-status]');
    await status.waitFor({ state: 'visible' });
    const english = (await status.textContent()).trim();
    assert.ok(english.length > 0);
    assert.equal(english.includes('RAW INVENTORY MESSAGE'), false);
    assert.equal(await status.getAttribute('role'), 'alert');
    assert.equal(await page.locator('[data-buy-add]').isEnabled(), true);
    await page.evaluate(() => RXSZ.setLang('es'));
    assert.notEqual((await status.textContent()).trim(), english);
    assert.equal(api.adds.length, 1);
    assert.ok(api.reads >= 2, 'Stock errors may have changed the real cart and must be reconciled');
    await page.locator('[data-buy-close]').click();
    await page.locator('[data-cart-open]').first().click();
    await waitCart(page);
    assert.equal(await page.locator('[data-cart-line="101:rxsz"]').count(), 1);
    assert.equal(cents(await page.locator('[data-cart-total]').textContent()), 11180);
  } finally { await context.close(); }
});

test('Shopify a network failure keeps the selection and real cart intact, then permits an explicit retry', async () => {
  const { page, context, api } = await visit('health', { shopify: true });
  try {
    api.addReply = async (_payload, route) => { await route.abort('failed'); };
    await openBuy(page);
    await page.locator('[data-buy-quantity]').fill('2');
    await page.locator('[data-buy-add]').click();
    const status = page.locator('[data-buy-status]');
    await status.waitFor({ state: 'visible' });
    assert.ok((await status.textContent()).trim().length > 0);
    assert.equal(await page.locator('[data-buy-dialog]').evaluate(element => element.open), true);
    assert.equal(await page.locator('[data-buy-quantity]').inputValue(), '2');
    assert.equal(await page.locator('[data-buy-variant]').inputValue(), '101');
    assert.equal(await page.locator('[data-buy-add]').isEnabled(), true);
    await waitCount(page, 1);
    assert.equal(api.items.length, 1);
    assert.equal(api.adds.length, 1);
    api.addReply = null;
    await page.locator('[data-buy-add]').click();
    await waitCart(page);
    await waitCount(page, 3);
    assert.equal(api.adds.length, 2);
    const retry = api.adds[1].items ? api.adds[1].items[0] : api.adds[1];
    assert.equal(String(retry.id), '101');
    assert.equal(Number(retry.quantity), 2);
  } finally { await context.close(); }
});

test('Shopify native locale uses configured translation assets under a page route and preserves its storefront URLs', async () => {
  const loadedLanguages = [];
  const documentPath = '/es/pages/rxsz-beauty?lang=en#offer';
  const otherPage = '/es/pages/rxsz-health?view=funnel#offer';
  const { page, context, api } = await visit('beauty', {
    shopify: true,
    documentPath,
    setup: async (page, api) => {
      api.config.nativeLocale = true;
      api.config.i18nUrls = {
        beauty: { en: '/theme-assets/rxsz-beauty.en.json', es: '/theme-assets/rxsz-beauty.es.json' }
      };
      await page.addInitScript(() => localStorage.setItem('rxsz-lang', 'en'));
      await page.route('**/assets/i18n/**', route => route.abort());
      await page.route('**/theme-assets/rxsz-beauty.*.json', route => {
        const language = new URL(route.request().url()).pathname.includes('.es.') ? 'es' : 'en';
        loadedLanguages.push(language);
        return route.fulfill({
          status: 200, contentType: 'application/json',
          body: fs.readFileSync(path.join(root, 'assets', 'i18n', `beauty.${language}.json`), 'utf8')
        });
      });
      const markup = fs.readFileSync(path.join(root, 'beauty.html'), 'utf8')
        .replace('<html lang="en"', '<html lang="es"')
        .replaceAll('assets/', '/assets/')
        .replaceAll('href="beauty.html"', 'href="/es/pages/rxsz-beauty?view=funnel#offer"')
        .replaceAll('href="health.html"', `href="${otherPage}"`);
      await page.route(url => url.pathname === '/es/pages/rxsz-beauty', route => route.fulfill({ status: 200, contentType: 'text/html', body: markup }));
    }
  });
  try {
    assert.equal(await page.evaluate(() => RXSZ.getLang()), 'es', 'The server locale takes precedence over a saved preference or preview query');
    assert.deepEqual(loadedLanguages, ['es']);
    assert.equal(new URL(page.url()).pathname + new URL(page.url()).search + new URL(page.url()).hash, documentPath);
    const links = page.locator('[data-page-link][data-i18n="nav.health"]');
    for (const link of await links.all()) assert.equal(await link.getAttribute('href'), otherPage);
    await openBuy(page);
    assert.equal(cents(await page.locator('[data-buy-price]').textContent()), 4990);
    const beforeTranslation = page.url();
    await page.evaluate(() => RXSZ.setLang('en'));
    assert.deepEqual(loadedLanguages, ['es', 'en']);
    assert.equal(await page.locator('[data-buy-add]').textContent(), await page.evaluate(() => RXSZ.t('commerce.add')));
    assert.equal(page.url(), beforeTranslation);
    for (const link of await links.all()) assert.equal(await link.getAttribute('href'), otherPage);
    await page.locator('[data-buy-add]').click();
    await waitCart(page);
    await waitCount(page, 2);
    assert.equal(api.adds.length, 1, 'Cart requests still use the native /es/ route after UI translation');
    assert.equal(await page.locator('[data-cart-checkout]').getAttribute('href'), '/es/checkout');
  } finally { await context.close(); }
});

test('Shopify a stale cart read cannot erase a newer successful addition or disable its checkout', async () => {
  const { page, context, api } = await visit('beauty', { shopify: true, initialItems: [] });
  let releaseStale;
  try {
    let receiveStale;
    const staleReceived = new Promise(resolve => { receiveStale = resolve; });
    const staleSnapshot = api.cart();
    api.readReply = async (route, sequence) => {
      if (sequence === 2) {
        await new Promise(resolve => { releaseStale = resolve; receiveStale(); });
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(staleSnapshot) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(api.cart()) });
      }
    };
    await page.locator('[data-cart-open]').first().click();
    await waitCart(page);
    await requestReceived(staleReceived);
    await page.locator('[data-cart-close]').first().click();
    await openBuy(page);
    await page.locator('[data-buy-add]').click();
    await waitCart(page);
    await waitCount(page, 1);
    assert.equal(await page.locator('[data-cart-checkout]').getAttribute('href'), '/es/checkout');
    const responseArrived = page.waitForResponse(response => new URL(response.url()).pathname === '/es/cart.js');
    releaseStale();
    const response = await responseArrived;
    await response.finished();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(Number(await page.locator('[data-cart-count]').textContent()), 1);
    assert.equal(await page.locator('[data-cart-line="101:rxsz"]').count(), 1);
    assert.equal(await page.locator('[data-cart-checkout]').getAttribute('href'), '/es/checkout');
    assert.equal(cents(await page.locator('[data-cart-total]').textContent()), 4990);
    assert.equal(api.adds.length, 1);
  } finally {
    if (releaseStale) releaseStale();
    await context.close();
  }
});

test('Shopify initially displays the selected variant photo even when the product gallery starts with another option', async () => {
  const { page, context } = await visit('beauty', {
    shopify: true,
    setup: async (_page, api) => {
      const product = api.config.commerce.product;
      product.images = [
        { src: '/assets/img/beauty-offer-authentic.webp', alt: 'White option' },
        { src: '/assets/img/beauty-product-authentic.webp', alt: 'Blue option' }
      ];
      product.variants[0].featured_image = clone(product.images[1]);
      product.variants[1].featured_image = clone(product.images[0]);
    }
  });
  try {
    await openBuy(page);
    assert.equal(await page.locator('[data-buy-variant]').inputValue(), '101');
    await page.waitForFunction(() => {
      const image = document.querySelector('[data-buy-image]');
      return image?.complete && image.naturalWidth > 0;
    });
    assert.ok((await page.locator('[data-buy-image]').getAttribute('src')).endsWith('/assets/img/beauty-product-authentic.webp'), 'The selected Blue variant must show its own featured photograph');
    assert.equal(await page.locator('[data-buy-gallery-select="1"]').getAttribute('aria-pressed'), 'true');
    await page.evaluate(() => RXSZ.setLang('es'));
    assert.ok((await page.locator('[data-buy-image]').getAttribute('src')).endsWith('/assets/img/beauty-product-authentic.webp'));
    assert.equal(await page.locator('[data-buy-gallery-select="1"]').getAttribute('aria-pressed'), 'true');
  } finally { await context.close(); }
});

test('Shopify keyboard cart changes restore focus to the corresponding control and removal returns focus to close', async () => {
  const { page, context, api } = await visit('health', {
    shopify: true,
    initialItems: [makeLine(101, '101:rxsz', 2, 4990), makeLine(201, '201:other', 1, 1200, 'Existing product')]
  });
  try {
    await page.locator('[data-cart-open]').first().click();
    await waitCart(page);
    await page.locator('[data-cart-line="101:rxsz"] [data-cart-increase]').focus();
    await page.keyboard.press('Enter');
    await waitCount(page, 4);
    await page.waitForFunction(() => document.activeElement.matches('[data-cart-increase]') && document.activeElement.closest('[data-cart-line]')?.dataset.cartLine === '101:rxsz');
    assert.equal(await page.locator('[data-cart-line="101:rxsz"] [data-cart-increase]').isEnabled(), true);
    await page.locator('[data-cart-line="101:rxsz"] [data-cart-remove]').focus();
    await page.keyboard.press('Enter');
    await waitCount(page, 1);
    await page.waitForFunction(() => document.activeElement === document.querySelector('[data-cart-close]'));
    assert.equal(await page.locator('[data-cart-line="201:other"]').count(), 1);
    assert.deepEqual(api.changes.map(item => [item.id, Number(item.quantity)]), [['101:rxsz', 3], ['101:rxsz', 0]]);
  } finally { await context.close(); }
});
