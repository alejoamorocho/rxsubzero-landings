/* Shared product panel and cart. Shopify handles the catalog and payment;
   the explicitly marked demo never sends a store request. */
(function (window, document) {
  'use strict';
  const config = window.RXSZ_CONFIG || {};
  const settings = config.commerce || {};
  const mode = settings.mode;
  const buy = document.querySelector('[data-buy-dialog]');
  const drawer = document.querySelector('[data-cart-dialog]');
  if (!buy || !drawer || !['demo', 'shopify'].includes(mode)) return;
  const query = (selector, context = document) => context.querySelector(selector);
  const all = (selector, context = document) => [...context.querySelectorAll(selector)];
  const lang = () => window.RXSZ?.getLang() || document.documentElement.lang || 'en';
  const t = key => window.RXSZ?.t('commerce.' + key) || key;
  const text = (selector, value, context = document) => { const el = query(selector, context); if (el) el.textContent = value; };
  const demoKey = 'rxsz-demo-cart-v1';
  const money = amount => new Intl.NumberFormat(lang() === 'es' ? 'es-CO' : 'en-US', { style: 'currency', currency: cart.currency || settings.currency || config.currency || 'USD', currencyDisplay: 'code' }).format(Number(amount || 0) / 100);
  const product = mode === 'demo' ? demoProduct() : settings.product;
  const ready = !!(product && Array.isArray(product.variants) && product.variants.length);
  let variant = ready ? product.variants.find(item => item.available) || product.variants[0] : null;
  let selectedImage = 0;
  let imageVersion = 0;
  let galleryError = false;
  let busy = false;
  let cartLoaded = mode === 'demo';
  let cartReadVersion = 0;
  let pendingCartFocus = null;
  let cart = { items: [], item_count: 0, total_price: 0, total_discount: 0, currency: settings.currency || config.currency || 'USD' };
  let buyMessage = '';
  let cartMessage = '';
  let activeDialog = null;
  let returnFocus = null;
  let previousOverflow = '';

  function demoProduct() {
    const img = query('#product img');
    return {
      title: 'RX SUBZERO', has_only_default_variant: true,
      variants: [{ id: 'rxsz-demo', title: 'RX SUBZERO', available: true, price: Math.round(Number(config.referencePrice || 49.90) * 100), quantity_rule: { min: 1, increment: 1, max: 99 } }],
      images: [img, query('[data-explorer-slide]:nth-of-type(3) img'), query('[data-explorer-slide]:nth-of-type(4) img'), query('[data-explorer-slide] img')].filter(Boolean).map((el, index) => ({ src: el.getAttribute('src'), element: el, name: ['image_product', 'image_inside', 'image_folded', 'image_routine'][index] }))
    };
  }

  function safeUrl(value, sameOrigin = false) {
    if (!value || typeof value !== 'string') return '';
    try {
      const url = new URL(value, window.location.href);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || (sameOrigin && url.origin !== window.location.origin)) return '';
      return url.href;
    } catch (_) { return ''; }
  }

  function route(resource) {
    const base = new URL(settings.root || '/', window.location.origin);
    if (base.origin !== window.location.origin || !base.pathname.endsWith('/')) throw new Error('Invalid storefront root');
    return new URL(resource, base).href;
  }

  async function request(resource, payload) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(route(resource), {
        method: payload ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: { Accept: 'application/json', ...(payload ? { 'Content-Type': 'application/json' } : {}) },
        ...(payload ? { body: JSON.stringify(payload) } : {})
      });
      const data = await response.json();
      if (!response.ok) throw new Error('Cart request failed: ' + response.status);
      return data;
    } finally { clearTimeout(timeout); }
  }

  function rules(item) {
    const rule = (arguments.length ? item : variant)?.quantity_rule || {};
    return { min: Math.max(1, Number(rule.min) || 1), step: Math.max(1, Number(rule.increment) || 1), max: rule.max == null ? null : Number(rule.max) };
  }

  function quantityValid(quantity, item) {
    const rule = arguments.length > 1 ? rules(item) : rules();
    return Number.isInteger(quantity) && quantity >= rule.min && (rule.max == null || quantity <= rule.max) && (quantity - rule.min) % rule.step === 0;
  }

  function updateBuy() {
    if (!ready) return;
    text('[data-buy-title]', product.title);
    text('[data-buy-price]', money(variant.price));
    const input = query('[data-buy-quantity]');
    const rule = rules();
    input.min = String(rule.min); input.step = String(rule.step);
    if (rule.max == null) input.removeAttribute('max'); else input.max = String(rule.max);
    const quantity = Number(input.value);
    const add = query('[data-buy-add]');
    add.disabled = busy || !variant.available || !cartLoaded;
    add.textContent = t(!variant.available ? 'sold_out' : busy ? 'adding' : 'add');
    input.disabled = busy || !variant.available;
    query('[data-buy-decrease]').disabled = busy || !variant.available || quantity <= rule.min;
    query('[data-buy-increase]').disabled = busy || !variant.available || (rule.max != null && quantity + rule.step > rule.max);
    query('[data-buy-variant]').disabled = busy;
    text('[data-buy-status]', buyMessage ? t(buyMessage) : '');
    buy.setAttribute('aria-busy', String(busy));
    if (mode === 'shopify') for (const el of all('[data-reference-price]')) el.textContent = money(variant.price);
  }

  function buildVariants() {
    if (!ready) return;
    const select = query('[data-buy-variant]');
    const field = query('[data-buy-variant-field]');
    select.replaceChildren();
    for (const item of product.variants) {
      const option = document.createElement('option');
      option.value = String(item.id);
      option.textContent = item.title + (item.available ? '' : ' — ' + t('sold_out'));
      select.append(option);
    }
    select.value = String(variant.id);
    field.hidden = product.has_only_default_variant || product.variants.length === 1;
  }

  function images() {
    const source = product?.images?.length ? product.images : demoProduct().images;
    return source.map(image => typeof image === 'string' ? { src: image, alt: product.title } : image).filter(image => safeUrl(image.src || image.url));
  }

  function imageName(image, index) { return image.name ? t(image.name) : `${t('image_label')} ${index + 1}`; }
  function imageAlt(image) { return image.element?.alt || image.alt || product.title; }

  function buildGallery() {
    const group = query('[data-buy-gallery]');
    const focusedIndex = document.activeElement?.dataset.buyGallerySelect;
    group.replaceChildren();
    images().forEach((image, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'rxsz-buy__thumbnail'; button.dataset.buyGallerySelect = String(index);
      button.setAttribute('aria-pressed', String(index === selectedImage));
      button.setAttribute('aria-label', imageName(image, index));
      const photo = document.createElement('img'); photo.src = safeUrl(image.thumbnail || image.element?.currentSrc || image.src || image.url); photo.alt = ''; photo.width = 90; photo.height = 75; photo.loading = 'lazy';
      const name = document.createElement('span'); name.textContent = imageName(image, index);
      button.append(photo, name); group.append(button);
    });
    const image = images()[selectedImage];
    if (image) {
      query('[data-buy-image]').alt = imageAlt(image);
      text('[data-buy-image-caption]', imageName(image, selectedImage));
    }
    text('[data-buy-image-status]', galleryError ? t('image_error') : '');
    if (focusedIndex != null && buy.open) query(`[data-buy-gallery-select="${focusedIndex}"]`)?.focus({ preventScroll: true });
  }

  async function chooseImage(index, moveFocus = false) {
    const list = images();
    if (!list[index]) return;
    const token = ++imageVersion;
    if (moveFocus) query(`[data-buy-gallery-select="${index}"]`)?.focus({ preventScroll: true });
    const candidate = new Image(); candidate.src = safeUrl(list[index].src || list[index].url);
    try {
      await candidate.decode();
      if (token !== imageVersion) return;
      const photo = query('[data-buy-image]');
      photo.src = candidate.src; photo.alt = imageAlt(list[index]);
      selectedImage = index; galleryError = false;
      for (const button of all('[data-buy-gallery-select]')) button.setAttribute('aria-pressed', String(Number(button.dataset.buyGallerySelect) === index));
      text('[data-buy-image-caption]', imageName(list[index], index));
      text('[data-buy-image-status]', '');
    } catch (_) { if (token === imageVersion) { galleryError = true; text('[data-buy-image-status]', t('image_error')); } }
  }

  function show(dialog, trigger) {
    if (activeDialog === dialog) return;
    if (!activeDialog) {
      returnFocus = trigger || document.activeElement;
      previousOverflow = document.documentElement.style.overflow;
    } else activeDialog.close();
    activeDialog = dialog;
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
    query(dialog === buy ? '[data-buy-close]' : '[data-cart-close]', dialog).focus({ preventScroll: true });
  }

  function dismiss(dialog) { if (dialog.open) dialog.close(); release(dialog); }
  function release(dialog) {
    if (activeDialog !== dialog || dialog.open) return;
    activeDialog = null;
    document.documentElement.style.overflow = previousOverflow;
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }

  function openProduct(trigger) {
    if (!ready) return;
    buildVariants(); updateBuy();
    show(buy, trigger);
    if (mode === 'shopify' && !cartLoaded) readCart().catch(() => { buyMessage = 'cart_error'; updateBuy(); });
  }

  async function openCart(trigger) {
    show(drawer, trigger); renderCart();
    if (mode === 'shopify' && !busy) {
      cartMessage = 'loading'; renderCart();
      try { if (await readCart()) cartMessage = ''; }
      catch (_) { cartLoaded = false; cartMessage = 'cart_error'; }
      renderCart(); updateBuy();
    }
  }

  function restoreDemo() {
    try {
      const saved = JSON.parse(localStorage.getItem(demoKey));
      if (saved && Number.isInteger(saved.quantity) && saved.quantity > 0 && saved.quantity <= 99) demoCart(saved.quantity);
    } catch (_) { /* Storage is optional in private browsing. */ }
  }

  function demoCart(quantity) {
    const first = product.variants[0];
    const image = images()[0];
    cart = { currency: config.currency || 'USD', item_count: quantity, total_price: first.price * quantity, total_discount: 0, items: quantity ? [{ key: 'rxsz-demo', variant_id: first.id, product_title: product.title, quantity, final_price: first.price, final_line_price: first.price * quantity, image: image?.src, variant_title: null }] : [] };
    try { localStorage.setItem(demoKey, JSON.stringify({ quantity })); } catch (_) { /* optional */ }
  }

  async function readCart() {
    const version = ++cartReadVersion;
    let data;
    try { data = await request('cart.js'); }
    catch (error) { if (version !== cartReadVersion) return false; throw error; }
    if (version !== cartReadVersion) return false;
    if (!Array.isArray(data.items) || typeof data.total_price !== 'number') throw new Error('Invalid cart');
    cart = data; cartLoaded = true; renderCart(); updateBuy();
    return true;
  }

  function el(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value != null) node.textContent = value;
    return node;
  }

  function cartLine(item) {
    const line = el('article', 'rxsz-cart__line'); line.dataset.cartLine = item.key;
    const image = el('img'); const src = safeUrl(item.image || item.featured_image?.url || item.featured_image?.src);
    if (src) image.src = src; else image.hidden = true;
    image.alt = item.featured_image?.alt || item.product_title || item.title; image.width = 90; image.height = 100;
    const body = el('div');
    body.append(el('h3', '', item.product_title || item.title));
    if (item.variant_title && item.variant_title !== 'Default Title') body.append(el('p', 'rxsz-cart__variant', item.variant_title));
    for (const [name, value] of Object.entries(item.properties || {})) {
      if (value && !name.startsWith('_')) body.append(el('p', 'rxsz-cart__variant', name + ': ' + value));
    }
    if (item.selling_plan_allocation?.selling_plan?.name) body.append(el('p', 'rxsz-cart__variant', item.selling_plan_allocation.selling_plan.name));
    body.append(el('p', 'rxsz-cart__line-price', money(item.final_line_price ?? item.line_price)));
    const actions = el('div', 'rxsz-cart__line-actions');
    const quantity = el('div', 'rxsz-quantity');
    const itemVariant = product?.variants?.find(v => String(v.id) === String(item.variant_id));
    const rule = rules(item.quantity_rule ? { quantity_rule: item.quantity_rule } : itemVariant);
    for (const [name, symbol, disabled] of [['decrease', '−', item.quantity <= rule.min], ['increase', '+', rule.max != null && item.quantity + rule.step > rule.max]]) {
      const button = el('button', '', symbol); button.type = 'button'; button.dataset['cart' + name[0].toUpperCase() + name.slice(1)] = '';
      button.setAttribute('aria-label', t(name) + ': ' + (item.product_title || item.title)); button.disabled = busy || disabled;
      if (name === 'decrease') quantity.append(button); else {
        const count = el('input'); count.type = 'number'; count.value = item.quantity; count.min = rule.min; count.step = rule.step;
        if (rule.max != null) count.max = rule.max; count.dataset.cartQuantity = ''; count.disabled = busy;
        count.setAttribute('aria-label', t('quantity') + ': ' + (item.product_title || item.title)); quantity.append(count, button);
      }
    }
    const remove = el('button', 'rxsz-cart__remove', t('remove')); remove.type = 'button'; remove.dataset.cartRemove = ''; remove.disabled = busy;
    remove.setAttribute('aria-label', t('remove') + ': ' + (item.product_title || item.title));
    actions.append(quantity, remove); body.append(actions); line.append(image, body); return line;
  }

  function renderCart() {
    const items = query('[data-cart-items]');
    const focused = document.activeElement?.closest('[data-cart-line]');
    const focusKey = focused?.dataset.cartLine;
    const action = document.activeElement?.hasAttribute('data-cart-remove') ? 'data-cart-remove' : document.activeElement?.hasAttribute('data-cart-increase') ? 'data-cart-increase' : document.activeElement?.hasAttribute('data-cart-decrease') ? 'data-cart-decrease' : 'data-cart-quantity';
    items.replaceChildren(...cart.items.map(cartLine));
    if (focusKey && drawer.open) {
      const target = all('[data-cart-line]').find(item => item.dataset.cartLine === focusKey);
      (target?.querySelector('[' + action + ']') || query('[data-cart-close]', drawer)).focus({ preventScroll: true });
    }
    const hasItems = cart.items.length > 0;
    query('[data-cart-empty]').hidden = hasItems;
    query('[data-cart-summary]').hidden = !hasItems;
    text('[data-cart-total]', money(cart.total_price));
    text('[data-cart-discount]', money(cart.total_discount));
    query('[data-cart-discount-row]').hidden = !cart.total_discount;
    text('[data-cart-status]', cartMessage ? t(cartMessage) : '');
    query('[data-cart-status]').classList.toggle('is-success', ['added', 'loading'].includes(cartMessage));
    query('[data-cart-status]').setAttribute('role', ['added', 'loading'].includes(cartMessage) ? 'status' : 'alert');
    for (const badge of all('[data-cart-count]')) badge.textContent = String(cart.item_count || 0);
    const checkout = query('[data-cart-checkout]');
    const checkoutUrl = mode === 'shopify' ? safeUrl(settings.checkoutUrl || route('checkout'), true) : '';
    const enabled = !!(checkoutUrl && cartLoaded && hasItems && !busy);
    if (enabled) { checkout.setAttribute('href', settings.checkoutUrl || route('checkout')); checkout.removeAttribute('aria-disabled'); checkout.removeAttribute('tabindex'); }
    else { checkout.removeAttribute('href'); checkout.setAttribute('aria-disabled', 'true'); checkout.tabIndex = -1; }
    drawer.setAttribute('aria-busy', String(busy));
  }

  function setBusy(value) {
    if (value) {
      ++cartReadVersion;
      const focusedLine = document.activeElement?.closest('[data-cart-line]');
      if (focusedLine) pendingCartFocus = { key: focusedLine.dataset.cartLine, action: [...document.activeElement.attributes].find(attr => /^data-cart-(increase|decrease|remove|quantity)$/.test(attr.name))?.name };
    }
    busy = value; updateBuy(); renderCart();
    if (!value && pendingCartFocus && drawer.open) {
      const line = all('[data-cart-line]').find(item => item.dataset.cartLine === pendingCartFocus.key);
      const target = line?.querySelector('[' + pendingCartFocus.action + ']');
      (target && !target.disabled ? target : query('[data-cart-close]', drawer)).focus({ preventScroll: true });
      pendingCartFocus = null;
    }
  }

  async function add(event) {
    event.preventDefault();
    if (busy || !variant?.available || !cartLoaded) return;
    const quantity = Number(query('[data-buy-quantity]').value);
    if (!quantityValid(quantity)) { buyMessage = 'quantity_error'; updateBuy(); return; }
    setBusy(true); buyMessage = ''; cartMessage = '';
    let completed = false;
    try {
      if (mode === 'demo') {
        const total = cart.item_count + quantity;
        if (!quantityValid(total)) throw new Error('Demo quantity limit');
        demoCart(total);
      } else {
        await request('cart/add.js', { items: [{ id: variant.id, quantity }] });
        await readCart();
      }
      completed = true; cartMessage = 'added';
    } catch (_) {
      buyMessage = 'add_error';
      if (mode === 'shopify') {
        try { await readCart(); }
        catch (_) { cartLoaded = false; cartMessage = 'cart_error'; }
      }
    } finally { setBusy(false); }
    if (completed) { show(drawer); renderCart(); }
  }

  async function change(key, quantity) {
    if (busy) return;
    const item = cart.items.find(line => line.key === key);
    if (!item) return;
    const itemVariant = product?.variants?.find(v => String(v.id) === String(item.variant_id));
    if (quantity !== 0 && !quantityValid(quantity, item.quantity_rule ? { quantity_rule: item.quantity_rule } : itemVariant)) { cartMessage = 'quantity_error'; renderCart(); return; }
    setBusy(true); cartMessage = '';
    try {
      if (mode === 'demo') demoCart(quantity);
      else {
        const data = await request('cart/change.js', { id: key, quantity });
        if (!Array.isArray(data.items)) throw new Error('Invalid cart');
        cart = data; cartLoaded = true;
      }
    } catch (_) {
      cartMessage = 'change_error';
      if (mode === 'shopify') {
        try { await readCart(); }
        catch (_) { cartLoaded = false; cartMessage = 'cart_error'; }
      }
    } finally { setBusy(false); }
  }

  function buildPolicies() {
    for (const nav of all('[data-commerce-policies]')) {
      nav.replaceChildren();
      for (const policy of settings.policies || []) {
        const url = safeUrl(policy.url);
        if (!url) continue;
        const link = el('a', '', policy.title); link.href = url; nav.append(link);
      }
    }
  }

  function refreshLanguage() {
    if (ready) { buildVariants(); updateBuy(); buildGallery(); }
    renderCart();
  }

  for (const notice of all('[data-commerce-demo]')) notice.hidden = mode !== 'demo';
  for (const label of all('[data-commerce-reference]')) label.hidden = mode !== 'demo';
  for (const button of all('.rxsz-nav__cart')) button.hidden = false;
  if (mode === 'demo' && ready) restoreDemo();
  if (ready) {
    const featured = variant.featured_image;
    const featuredIndex = featured ? images().findIndex(image => safeUrl(image.src || image.url) === safeUrl(featured.src || featured.url)) : -1;
    if (featuredIndex >= 0) selectedImage = featuredIndex;
    query('[data-buy-quantity]').value = String(rules().min);
    buildVariants(); buildGallery(); updateBuy();
    const image = images()[selectedImage];
    if (image) query('[data-buy-image]').src = safeUrl(image.src || image.url);
  }
  buildPolicies(); renderCart();
  window.RXSZ_COMMERCE = { ready, mode, openProduct, openCart };
  document.dispatchEvent(new CustomEvent('rxsz:commerce-ready'));
  if (mode === 'shopify') readCart().catch(() => { cartLoaded = false; cartMessage = 'cart_error'; updateBuy(); renderCart(); });

  document.addEventListener('rxsz:langchange', refreshLanguage);
  query('[data-buy-form]').addEventListener('submit', add);
  query('[data-buy-quantity]').addEventListener('input', () => { buyMessage = ''; updateBuy(); });
  query('[data-buy-variant]').addEventListener('change', event => {
    const next = product.variants.find(item => String(item.id) === event.target.value);
    if (!next) return;
    variant = next; buyMessage = ''; query('[data-buy-quantity]').value = String(rules().min); updateBuy();
    const image = variant.featured_image;
    if (image) { const index = images().findIndex(item => safeUrl(item.src || item.url) === safeUrl(image.src || image.url)); if (index >= 0) chooseImage(index); }
  });
  query('[data-buy-gallery]').addEventListener('keydown', event => {
    const button = event.target.closest('[data-buy-gallery-select]'); if (!button) return;
    const index = Number(button.dataset.buyGallerySelect); const count = images().length;
    const next = event.key === 'ArrowRight' ? (index + 1) % count : event.key === 'ArrowLeft' ? (index - 1 + count) % count : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : null;
    if (next != null) { event.preventDefault(); chooseImage(next, true); }
  });
  document.addEventListener('click', event => {
    const target = event.target.closest('button,a'); if (!target) return;
    if (target.matches('[data-purchase-action="checkout"]') && ready && (window.RXSZ_CONFIG || {}).commerce?.mode === mode) { event.preventDefault(); openProduct(target); }
    else if (target.matches('[data-cart-open]')) { event.preventDefault(); openCart(target); }
    else if (target.matches('[data-cart-shop]')) openProduct(target);
    else if (target.matches('[data-buy-close]')) dismiss(buy);
    else if (target.matches('[data-cart-close]')) dismiss(drawer);
    else if (target.matches('[data-cart-checkout][aria-disabled="true"]')) event.preventDefault();
    else if (target.matches('[data-buy-gallery-select]')) chooseImage(Number(target.dataset.buyGallerySelect));
    else if (target.matches('[data-buy-decrease],[data-buy-increase]') && !busy) {
      const input = query('[data-buy-quantity]'); const rule = rules();
      const value = Number(input.value) + (target.matches('[data-buy-increase]') ? rule.step : -rule.step);
      if (quantityValid(value)) { input.value = value; buyMessage = ''; updateBuy(); }
    } else if (target.matches('[data-cart-remove],[data-cart-decrease],[data-cart-increase]')) {
      const key = target.closest('[data-cart-line]').dataset.cartLine;
      const item = cart.items.find(line => line.key === key);
      const itemVariant = product?.variants?.find(v => String(v.id) === String(item.variant_id));
      const rule = rules(item.quantity_rule ? { quantity_rule: item.quantity_rule } : itemVariant);
      change(key, target.matches('[data-cart-remove]') ? 0 : item.quantity + (target.matches('[data-cart-increase]') ? rule.step : -rule.step));
    }
  });
  query('[data-cart-items]').addEventListener('change', event => {
    if (event.target.matches('[data-cart-quantity]')) change(event.target.closest('[data-cart-line]').dataset.cartLine, Number(event.target.value));
  });
  for (const dialog of [buy, drawer]) {
    dialog.addEventListener('close', () => release(dialog));
    dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(dialog); });
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const controls = all('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]', dialog).filter(el => el.getClientRects().length && el.tabIndex >= 0);
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dismiss(dialog);
    });
  }
})(window, document);
