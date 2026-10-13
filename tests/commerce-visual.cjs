// A running local preview is required; PREVIEW_URL can select another server.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const output = path.resolve(__dirname, '../output/qa-commerce');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let combinations = 0, photographs = 0;
  try {
    for (const name of ['beauty', 'health']) for (const lang of ['en', 'es']) {
      for (const width of [320, 390, 600, 768, 980, 1024, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: width > 760 ? 1000 : 844 }, reducedMotion: 'reduce' });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base}/${name}.html?lang=${lang}`);
        await page.waitForFunction(lang => window.RXSZ?.getLang() === lang && window.RXSZ_COMMERCE?.ready, lang);
        await page.evaluate(() => document.fonts.ready);
        await page.locator('[data-purchase-action="checkout"]').click();
        await page.waitForFunction(() => document.querySelector('[data-buy-dialog]').open);
        for (let index = 0; index < 4; index++) {
          await page.locator(`[data-buy-gallery-select="${index}"]`).click();
          await page.waitForFunction(index => document.querySelector(`[data-buy-gallery-select="${index}"]`).getAttribute('aria-pressed') === 'true', index);
          assert.ok(await page.locator('[data-buy-image]').evaluate(image => image.complete && image.naturalWidth > 0));
          photographs++;
        }
        await page.locator('[data-buy-gallery-select="0"]').click();
        await page.waitForFunction(() => document.querySelector('[data-buy-gallery-select="0"]').getAttribute('aria-pressed') === 'true');
        const buy = await page.locator('[data-buy-dialog]').evaluate(dialog => {
          const box = dialog.getBoundingClientRect();
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, scroll: dialog.scrollWidth, width: dialog.clientWidth, viewport: innerHeight };
        });
        assert.ok(buy.left >= 0 && buy.right <= width && buy.top >= 0 && buy.bottom <= buy.viewport + 1, 'Product dialog stays within screen');
        assert.ok(buy.scroll <= buy.width + 1, 'Product content has no horizontal overflow');
        if ([390, 1440].includes(width)) {
          await page.locator('[data-buy-dialog]').screenshot({ path: path.join(output, `${name}-${lang}-${width}-product.png`) });
          await page.locator('[data-buy-add]').scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(output, `${name}-${lang}-${width}-product-action.png`) });
        }
        await page.locator('[data-buy-add]').click();
        await page.waitForFunction(() => document.querySelector('[data-cart-dialog]').open);
        const cart = await page.locator('[data-cart-dialog]').evaluate(dialog => {
          const box = dialog.getBoundingClientRect();
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, scroll: dialog.scrollWidth, width: dialog.clientWidth, viewport: innerHeight };
        });
        assert.ok(cart.left >= 0 && cart.right <= width && cart.top >= 0 && cart.bottom <= cart.viewport + 1, 'Cart stays within screen');
        assert.ok(cart.scroll <= cart.width + 1, 'Cart content has no horizontal overflow');
        assert.equal(await page.locator('[data-cart-checkout]').getAttribute('aria-disabled'), 'true');
        assert.equal(await page.locator('[data-cart-discount-row]').isVisible(), false, 'No discount row is shown when there is no discount');
        await page.locator('[data-cart-checkout]').scrollIntoViewIfNeeded();
        if ([390, 1440].includes(width)) await page.screenshot({ path: path.join(output, `${name}-${lang}-${width}-cart.png`) });
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
        assert.deepEqual(errors, []);
        await context.close(); combinations++;
      }
    }
    const context = await browser.newContext({ viewport: { width: 320, height: 480 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${base}/beauty.html?lang=es`);
    await page.waitForFunction(() => window.RXSZ_COMMERCE?.ready);
    await page.locator('[data-purchase-action="checkout"]').click();
    await page.locator('[data-buy-add]').click();
    await page.locator('[data-cart-checkout]').scrollIntoViewIfNeeded();
    assert.ok(await page.locator('[data-cart-checkout]').isVisible());
    await context.close();
    console.log(`PASS: ${combinations} product/cart layouts, ${photographs} product photographs, plus short mobile viewport.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
