/* Generate a mergeable Shopify theme overlay from the reviewed static pages.
 * Run: node scripts/build-shopify.cjs [--check] [--merge-theme <theme-directory>]
 * The output owns only the files recorded in shopify/manifest.json. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'shopify');
const AUDIENCES = ['beauty', 'health'];
const LANGUAGES = ['en', 'es'];
const VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const sourcePaths = new Set();
const DAWN = Object.freeze({version: '16.0.0', sha: 'bc39a7d2024f1e5c14c42f855bd3552b4913e204', release: 'https://github.com/Shopify/dawn/releases/tag/v16.0.0'});

function read(relative) {
  sourcePaths.add(relative.replace(/\\/g, '/'));
  return normalizeSource(relative, fs.readFileSync(path.join(ROOT, relative)));
}
function normalizeSource(relative, content) {
  // Git stores text as LF even when a Windows checkout uses CRLF. Hash and
  // copy that canonical representation, while retaining image/font/ZIP bytes.
  if (/\.(?:js|css|html|json|cjs|md|liquid|yml|yaml|txt)$/i.test(relative)) return Buffer.from(content.toString('utf8').replace(/\r\n/g, '\n'));
  return content;
}
function assetName(relative) { return 'rxsz-' + path.basename(relative); }
function assetLiquid(relative) { return "{{ '" + assetName(relative) + "' | asset_url }}"; }
function localeKey(audience, key) { return `rxsz.${audience}.${key.replace(/\./g, '_')}`; }
function translated(audience, key) { return `{{ '${localeKey(audience, key)}' | t | escape }}`; }
function flatten(value, prefix = '', result = {}) {
  for (const [key, entry] of Object.entries(value)) {
    const next = prefix ? prefix + '_' + key : key;
    if (entry && typeof entry === 'object') flatten(entry, next, result);
    else result[next] = entry;
  }
  return result;
}
function getAttr(node, name) { return node.attrs?.find(entry => entry.name === name)?.value; }
function setAttr(node, name, value) {
  const existing = node.attrs.find(entry => entry.name === name);
  if (existing) existing.value = value;
  else node.attrs.push({name, value});
}
function removeAttr(node, name) { node.attrs = node.attrs.filter(entry => entry.name !== name); }
function raw(value) { return {raw: value}; }

// A small HTML tree keeps nested spans and dialog markup intact. Only static
// source HTML enters this parser; Liquid is introduced after parsing.
function parseHTML(html) {
  const tree = {children: []};
  const stack = [tree];
  const tokens = html.match(/<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][^>]*>|[^<]+|</g) || [];
  for (const token of tokens) {
    const close = token.match(/^<\/([\w:-]+)\s*>$/);
    if (close) {
      const current = stack.pop();
      if (!current || current.tag !== close[1].toLowerCase()) throw new Error('Unbalanced source HTML: ' + token);
      continue;
    }
    const open = token.match(/^<([\w:-]+)([\s\S]*?)\/?\s*>$/);
    if (!open) { stack.at(-1).children.push(raw(token)); continue; }
    const node = {tag: open[1].toLowerCase(), attrs: [], children: [], selfClosing: /\/\s*>$/.test(token)};
    const attrPattern = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/g;
    for (const match of open[2].matchAll(attrPattern)) {
      node.attrs.push({name: match[1], value: match[2] ?? match[3] ?? match[4] ?? null});
    }
    stack.at(-1).children.push(node);
    if (!VOID.has(node.tag) && !node.selfClosing) stack.push(node);
  }
  if (stack.length !== 1) throw new Error('Unclosed source HTML element: ' + stack.at(-1).tag);
  return tree;
}
function render(node) {
  if ('raw' in node) return node.raw;
  if (!node.tag) return node.children.map(render).join('');
  const attrs = node.attrs.map(entry => ' ' + entry.name + (entry.value === null ? '' : '="' + entry.value + '"')).join('');
  const element = '<' + node.tag + attrs + (node.selfClosing ? '/>' : '>') + (VOID.has(node.tag) || node.selfClosing ? '' : node.children.map(render).join('') + '</' + node.tag + '>');
  return (node.before || '') + element + (node.after || '');
}

const SHARED = {
  en: {variant: 'Choose a variant', quantity: 'Quantity', add: 'Add to cart', unavailable: 'Currently unavailable', sold_out: 'Sold out', price_unavailable: 'Product not selected', policies: 'Store policies', product_unavailable: 'This product is not available to purchase yet.'},
  es: {variant: 'Elige una variante', quantity: 'Cantidad', add: 'Añadir al carrito', unavailable: 'No disponible actualmente', sold_out: 'Agotado', price_unavailable: 'Producto sin seleccionar', policies: 'Políticas de la tienda', product_unavailable: 'Este producto aún no está disponible para comprar.'}
};
const SCHEMA_LOCALES = {
  en: {name: 'RX SUBZERO landing', audience: 'Audience', beauty: 'Beauty', health: 'Wellness', product: 'Product', beauty_page: 'Beauty landing page', health_page: 'Wellness landing page', product_info: 'Select the live, one-time-purchase RX SUBZERO product. Prices, images, stock and cart come from Shopify.'},
  es: {name: 'Página RX SUBZERO', audience: 'Enfoque', beauty: 'Belleza', health: 'Bienestar', product: 'Producto', beauty_page: 'Página de belleza', health_page: 'Página de bienestar', product_info: 'Selecciona el producto RX SUBZERO para compra única. Shopify aporta los precios, las imágenes, el inventario y el carrito.'}
};

function nativeForm() {
  return `
<noscript>
  {% if rxsz_product != blank and rxsz_product.available and rxsz_product.requires_selling_plan == false %}
    {% assign rxsz_form_id = 'RXSZProductForm-' | append: section_id %}
    {% form 'product', rxsz_product, id: rxsz_form_id, class: 'rxsz-native-purchase' %}
      <label class="rxsz-native-purchase__label" for="RXSZVariant-{{ section_id }}">{{ 'rxsz.shared.variant' | t | escape }}</label>
      <select class="rxsz-native-purchase__input" id="RXSZVariant-{{ section_id }}" name="id" required>
        {% for variant in rxsz_product.variants limit: 250 %}
          <option value="{{ variant.id }}" {% if variant == rxsz_selected_variant %}selected{% endif %} {% unless variant.available %}disabled{% endunless %} {% if variant.requires_selling_plan %}disabled{% endif %}>
            {% if rxsz_product.has_only_default_variant %}{{ rxsz_product.title | escape }}{% else %}{{ variant.title | escape }}{% endif %} — {{ variant.price | money_with_currency }}{% unless variant.available %} — {{ 'rxsz.shared.sold_out' | t | escape }}{% endunless %}
          </option>
        {% endfor %}
      </select>
      <label class="rxsz-native-purchase__label" for="RXSZQuantity-{{ section_id }}">{{ 'rxsz.shared.quantity' | t | escape }}</label>
      <input class="rxsz-native-purchase__input" id="RXSZQuantity-{{ section_id }}" name="quantity" type="number" min="{{ rxsz_selected_variant.quantity_rule.min | default: 1 }}" step="{{ rxsz_selected_variant.quantity_rule.increment | default: 1 }}" {% if rxsz_selected_variant.quantity_rule.max != blank %}max="{{ rxsz_selected_variant.quantity_rule.max }}"{% endif %} value="{{ rxsz_selected_variant.quantity_rule.min | default: 1 }}" inputmode="numeric" required>
      <button class="rxsz-btn rxsz-btn--primary" type="submit" name="add">{{ 'rxsz.shared.add' | t | escape }}</button>
    {% endform %}
  {% else %}
    <p>{{ 'rxsz.shared.product_unavailable' | t | escape }}</p>
  {% endif %}
</noscript>`;
}

function languageForm(audience) {
  return `<div class="rxsz-langtoggle" role="group" aria-label="${translated(audience, 'nav.language')}">
  {% for language in localization.available_languages %}
    {% if language.iso_code == 'en' or language.iso_code == 'es' %}
      {% assign rxsz_locale_form_id = 'RXSZLanguage-' | append: section_id | append: '-' | append: language.iso_code %}
      {% form 'localization', id: rxsz_locale_form_id, class: 'rxsz-localization', return_to: request.path %}
        <input type="hidden" name="language_code" value="{{ language.iso_code | escape }}">
        <button class="rxsz-langtoggle__opt{% if language.iso_code == localization.language.iso_code %} is-active{% endif %}" type="submit" lang="{{ language.iso_code | escape }}" aria-label="{{ language.endonym_name | escape }}" aria-pressed="{% if language.iso_code == localization.language.iso_code %}true{% else %}false{% endif %}">{{ language.iso_code | upcase | escape }}</button>
      {% endform %}
    {% endif %}
  {% endfor %}
</div>`;
}

function transformBody(audience, html, dictionary, usedAssets) {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if (!body) throw new Error('Missing source body: ' + audience);
  const tree = parseHTML(body);
  function visit(parent) {
    parent.children = parent.children.filter(node => node.tag !== 'script');
    for (let index = 0; index < parent.children.length; index++) {
      const node = parent.children[index];
      if (!node.tag) continue;
      if (getAttr(node, 'class')?.split(/\s+/).includes('rxsz-langtoggle')) {
        parent.children[index] = raw(languageForm(audience));
        continue;
      }
      const binding = getAttr(node, 'data-i18n');
      if (binding) {
        const key = binding.replace(/\./g, '_');
        if (typeof dictionary[key] !== 'string') throw new Error(`Missing locale key ${audience}:${binding}`);
        node.children = [raw(translated(audience, binding))];
      }
      const attributeBinding = getAttr(node, 'data-i18n-attr');
      if (attributeBinding) for (const pair of attributeBinding.split(';')) {
        const colon = pair.indexOf(':');
        if (colon < 0) continue;
        const attr = pair.slice(0, colon).trim(), key = pair.slice(colon + 1).trim();
        if (typeof dictionary[key.replace(/\./g, '_')] !== 'string') throw new Error(`Missing locale attribute ${audience}:${key}`);
        setAttr(node, attr, translated(audience, key));
      }
      for (const entry of node.attrs) {
        if (typeof entry.value !== 'string') continue;
        entry.value = entry.value.replace(/assets\/(?:img|css|js)\/[\w.-]+/g, relative => {
          usedAssets.add(relative);
          return assetLiquid(relative);
        });
      }
      if (getAttr(node, 'data-page-link') !== undefined) {
        const href = getAttr(node, 'href');
        const targetAudience = AUDIENCES.find(value => href === value + '.html');
        if (!targetAudience) throw new Error('Unknown cross-page URL: ' + href);
        removeAttr(node, 'data-page-link');
        setAttr(node, 'href', `{{ ${targetAudience}_page.url | escape }}`);
        node.before = `{% if ${targetAudience}_page != blank %}`;
        node.after = '{% endif %}';
      }
      if (getAttr(node, 'data-reference-price') !== undefined) {
        node.children = [raw(`{% if rxsz_product != blank %}{{ rxsz_selected_variant.price | money_with_currency }}{% else %}{{ 'rxsz.shared.price_unavailable' | t | escape }}{% endif %}`)];
      }
      if (getAttr(node, 'data-buy-price') !== undefined) {
        node.children = [raw('{% if rxsz_product != blank %}{{ rxsz_selected_variant.price | money_with_currency }}{% endif %}')];
      }
      if (getAttr(node, 'data-buy-title') !== undefined) {
        node.children = [raw('{% if rxsz_product != blank %}{{ rxsz_product.title | escape }}{% else %}RX SUBZERO{% endif %}')];
      }
      if (getAttr(node, 'data-purchase-label') !== undefined) {
        node.children = [raw(translated(audience, 'commerce.choose'))];
      }
      if (getAttr(node, 'data-commerce-demo') !== undefined) setAttr(node, 'hidden', '');
      if (binding === 'purchase.reference_label' || binding === 'purchase.reference_short') {
        node.attrs = node.attrs.filter(entry => entry.name !== 'data-i18n');
        setAttr(node, 'hidden', '');
        node.children = [];
      }
      if (getAttr(node, 'data-purchase-action') === 'checkout') {
        node.before = '{% if rxsz_product != blank %}';
        node.after = '{% endif %}' + nativeForm();
        // A page URL is the useful fallback if JS is disabled. The no-JS
        // form immediately below can also add the chosen variant directly.
        setAttr(node, 'href', '{{ rxsz_product.url | escape }}');
        removeAttr(node, 'aria-disabled');
        removeAttr(node, 'tabindex');
        setAttr(node, 'class', (getAttr(node, 'class') || '').replace(/\bis-disabled\b/g, '').trim() + ' rxsz-purchase-enhanced');
      }
      if (getAttr(node, 'data-purchase-availability') !== undefined) {
        node.before = '{% if rxsz_product == blank %}';
        node.after = '{% endif %}';
        removeAttr(node, 'data-i18n');
        node.children = [raw("{{ 'rxsz.shared.product_unavailable' | t | escape }}")];
      }
      visit(node);
    }
    parent.children = parent.children.filter(node => !('raw' in node) || node.raw.trim() !== '·');
  }
  visit(tree);
  const intro = `{% doc %}
  Render the RX SUBZERO ${audience} landing and its accessible purchase dialogs.
  Generated by scripts/build-shopify.cjs; edit the reviewed static source.

  @param {object} rxsz_product - Selected live Shopify product, or blank.
  @param {object} rxsz_selected_variant - First available purchase variant.
  @param {object} beauty_page - Beauty landing page.
  @param {object} health_page - Wellness landing page.
  @param {string} section_id - Unique parent section ID.
{% enddoc %}\n`;
  return intro + render(tree).trim() + '\n';
}

const safeJSON = expression => `{{ ${expression} | json | replace: '<', rxsz_json_lt | replace: '>', rxsz_json_gt | replace: '&', rxsz_json_amp }}`;
function configLiquid() {
  const image = variable => `{"src": ${safeJSON(variable + ' | image_url: width: 1600')}, "alt": ${safeJSON(variable + '.alt | default: rxsz_product.title')}}`;
  return `{% capture rxsz_json_lt %}\\u003c{% endcapture %}
{% capture rxsz_json_gt %}\\u003e{% endcapture %}
{% capture rxsz_json_amp %}\\u0026{% endcapture %}
<script>
  window.RXSZ_CONFIG = {
    nativeLocale: true,
    purchaseUrl: "",
    referencePrice: "",
    currency: ${safeJSON('cart.currency.iso_code')},
    i18nUrls: {
      beauty: { en: ${safeJSON("'rxsz-beauty.en.json' | asset_url")}, es: ${safeJSON("'rxsz-beauty.es.json' | asset_url")} },
      health: { en: ${safeJSON("'rxsz-health.en.json' | asset_url")}, es: ${safeJSON("'rxsz-health.es.json' | asset_url")} }
    },
    commerce: {
      mode: "shopify",
      root: ${safeJSON("routes.root_url | append: '/' | replace: '//', '/'")},
      cartUrl: ${safeJSON('routes.cart_url')},
      checkoutUrl: ${safeJSON("routes.root_url | append: '/checkout' | replace: '//', '/'")},
      currency: ${safeJSON('cart.currency.iso_code')},
      product: {% if rxsz_product != blank %}{
        title: ${safeJSON('rxsz_product.title')},
        has_only_default_variant: {{ rxsz_product.has_only_default_variant | json }},
        variants: [{% for variant in rxsz_product.variants limit: 250 %}
          {id: {{ variant.id | json }}, title: ${safeJSON('variant.title')}, price: {{ variant.price | json }}, compare_at_price: {{ variant.compare_at_price | json }}, available: {% if variant.available and variant.requires_selling_plan == false %}true{% else %}false{% endif %}, quantity_rule: {min: {{ variant.quantity_rule.min | default: 1 | json }}, max: {{ variant.quantity_rule.max | json }}, increment: {{ variant.quantity_rule.increment | default: 1 | json }}}, featured_image: {% if variant.featured_image != blank %}${image('variant.featured_image')}{% else %}null{% endif %}}{% unless forloop.last %},{% endunless %}
        {% endfor %}],
        images: [{% for image in rxsz_product.images limit: 50 %}${image('image')}{% unless forloop.last %},{% endunless %}{% endfor %}]
      }{% else %}null{% endif %},
      policies: [{% for policy in shop.policies %}{"title": ${safeJSON('policy.title')}, "url": ${safeJSON('policy.url')}}{% unless forloop.last %},{% endunless %}{% endfor %}]
    }
  };
</script>`;
}

function sectionLiquid() {
  const schema = {name: 't:rxsz.section.name', tag: 'div', class: 'rxsz-shopify-landing', limit: 1,
    settings: [
      {type: 'select', id: 'audience', label: 't:rxsz.section.audience', default: 'beauty', options: AUDIENCES.map(value => ({value, label: 't:rxsz.section.' + value}))},
      {type: 'product', id: 'product', label: 't:rxsz.section.product'},
      {type: 'paragraph', content: 't:rxsz.section.product_info'},
      {type: 'page', id: 'beauty_page', label: 't:rxsz.section.beauty_page'},
      {type: 'page', id: 'health_page', label: 't:rxsz.section.health_page'}
    ]};
  return `{% comment %}Generated overlay section. Product data always comes from Shopify.{% endcomment %}
{% liquid
  assign rxsz_product = section.settings.product
  assign rxsz_selected_variant = rxsz_product.selected_or_first_available_variant
  assign rxsz_audience = section.settings.audience
  if template.suffix == 'rxsz-health'
    assign rxsz_audience = 'health'
  elsif template.suffix == 'rxsz-beauty'
    assign rxsz_audience = 'beauty'
  endif
  assign beauty_page = section.settings.beauty_page
  assign health_page = section.settings.health_page
  if rxsz_audience == 'beauty' and beauty_page == blank
    assign beauty_page = page
  endif
  if rxsz_audience == 'health' and health_page == blank
    assign health_page = page
  endif
%}
${configLiquid()}
{% if rxsz_audience == 'health' %}
  {% render 'rxsz-health', rxsz_product: rxsz_product, rxsz_selected_variant: rxsz_selected_variant, beauty_page: beauty_page, health_page: health_page, section_id: section.id %}
{% else %}
  {% render 'rxsz-beauty', rxsz_product: rxsz_product, rxsz_selected_variant: rxsz_selected_variant, beauty_page: beauty_page, health_page: health_page, section_id: section.id %}
{% endif %}
{% if rxsz_product != blank %}
  <script type="application/ld+json">{{ rxsz_product | structured_data | replace: '<', rxsz_json_lt }}</script>
{% endif %}
{% schema %}
${JSON.stringify(schema, null, 2)}
{% endschema %}
`;
}

function layoutLiquid(styles, scripts) {
  return `{% liquid
  assign rxsz_audience = 'beauty'
  if template.suffix == 'rxsz-health'
    assign rxsz_audience = 'health'
  endif
  assign rxsz_title_key = 'rxsz.' | append: rxsz_audience | append: '.meta_title'
  assign rxsz_description_key = 'rxsz.' | append: rxsz_audience | append: '.meta_description'
  assign rxsz_social_image = 'rxsz-' | append: rxsz_audience | append: '-hero-life-1200-people.webp'
%}
<!doctype html>
<html lang="{{ request.locale.iso_code | escape }}" dir="{{ request.locale.direction | escape }}" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title data-i18n="meta.title">{{ rxsz_title_key | t | escape }}</title>
  <meta name="description" content="{{ rxsz_description_key | t | escape }}" data-i18n-attr="content:meta.description">
  <link rel="canonical" href="{{ canonical_url }}">
  <meta property="og:title" content="{{ rxsz_title_key | t | escape }}">
  <meta property="og:description" content="{{ rxsz_description_key | t | escape }}">
  <meta property="og:url" content="{{ canonical_url }}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="{{ shop.name | escape }}">
  <meta property="og:image" content="{{ rxsz_social_image | asset_url }}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="{{ 'rxsz-logo-official.png' | asset_url }}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Manrope:wght@500;600;700;800&amp;display=swap" rel="stylesheet">
${styles.map(value => '  {{ \'' + assetName(value) + "' | asset_url | stylesheet_tag }}").join('\n')}
  {{ 'rxsz-shopify.css' | asset_url | stylesheet_tag }}
  {{ content_for_header }}
</head>
<body class="rxsz theme-{{ rxsz_audience }}" data-page="{{ rxsz_audience }}">
  {{ content_for_layout }}
${scripts.map(value => `  <script src="${assetLiquid(value)}" defer></script>`).join('\n')}
  {% if request.design_mode %}
    <script>
      // Shopify re-renders sections in the editor. Refresh this standalone
      // preview so its selected catalog product and script state stay in sync.
      document.addEventListener('shopify:section:load', function (event) {
        if (event.target.querySelector('.rxsz-nav') && !document.documentElement.hasAttribute('data-rxsz-editor-refresh')) {
          document.documentElement.setAttribute('data-rxsz-editor-refresh', '');
          window.location.reload();
        }
      });
    </script>
  {% endif %}
</body>
</html>
`;
}

function buildFiles() {
  sourcePaths.clear();
  const files = new Map(), usedAssets = new Set(), locales = {};
  for (const lang of LANGUAGES) {
    locales[lang] = {rxsz: {shared: SHARED[lang]}};
    for (const audience of AUDIENCES) {
      const source = `assets/i18n/${audience}.${lang}.json`;
      const dict = JSON.parse(read(source));
      locales[lang].rxsz[audience] = flatten(dict);
      files.set('assets/' + assetName(source), Buffer.from(JSON.stringify(dict, null, 2) + '\n'));
    }
    const localeFilename = lang === 'en' ? 'en.default' : lang;
    files.set('locales/' + localeFilename + '.json', Buffer.from(JSON.stringify(locales[lang], null, 2) + '\n'));
    files.set('locales/' + localeFilename + '.schema.json', Buffer.from(JSON.stringify({rxsz: {section: SCHEMA_LOCALES[lang]}}, null, 2) + '\n'));
  }
  let styles, scripts;
  for (const audience of AUDIENCES) {
    const html = read(audience + '.html').toString();
    const pageStyles = Array.from(html.matchAll(/<link\b[^>]*href="(assets\/css\/[^"]+)"/g), value => value[1]);
    const pageScripts = Array.from(html.matchAll(/<script\b[^>]*src="(assets\/js\/[^"]+)"/g), value => value[1]).filter(value => !value.endsWith('/config.js'));
    if (styles && JSON.stringify(pageStyles) !== JSON.stringify(styles)) throw new Error('Pages must share their CSS dependency order.');
    if (scripts && JSON.stringify(pageScripts) !== JSON.stringify(scripts)) throw new Error('Pages must share their JS dependency order.');
    styles = pageStyles; scripts = pageScripts;
    files.set(`snippets/rxsz-${audience}.liquid`, Buffer.from(transformBody(audience, html, locales.en.rxsz[audience], usedAssets)));
    files.set(`templates/page.rxsz-${audience}.json`, Buffer.from(JSON.stringify({layout: 'rxsz', sections: {main: {type: 'rxsz-authentic-landing', settings: {audience}}}, order: ['main']}, null, 2) + '\n'));
  }
  [...styles, ...scripts].forEach(value => usedAssets.add(value));
  for (const relative of usedAssets) {
    if (relative.endsWith('/config.js')) continue;
    const target = 'assets/' + assetName(relative);
    const content = read(relative);
    if (files.has(target) && !files.get(target).equals(content)) throw new Error('Conflicting flattened asset: ' + target);
    files.set(target, content);
  }
  files.set('layout/rxsz.liquid', Buffer.from(layoutLiquid(styles, scripts)));
  files.set('sections/rxsz-authentic-landing.liquid', Buffer.from(sectionLiquid()));
  files.set('assets/rxsz-shopify.css', Buffer.from(`/* Shopify native form and localization additions. */
.rxsz-localization { margin:0; }
.rxsz-native-purchase { display:grid; gap:.75rem; margin-block:1rem; }
.rxsz-native-purchase__label { font-weight:600; }
.rxsz-native-purchase__input { min-block-size:44px; max-inline-size:100%; padding:.65rem .9rem; border:1px solid var(--auth-line); border-radius:4px; color:var(--auth-ink); background:var(--auth-white); font:inherit; }
.rxsz-native-purchase__input:focus-visible { outline:3px solid var(--auth-mist); outline-offset:3px; }
.no-js .rxsz-purchase-enhanced { display:none; }
`));
  validateFiles(files, locales);
  const manifest = {format: 1, purpose: 'Mergeable RX SUBZERO Shopify theme overlay; not a complete theme.', generator: 'scripts/build-shopify.cjs',
    sourceFiles: [...sourcePaths].sort().map(relative => ({path: relative, sha256: hash(read(relative))})),
    files: [...files].sort(([a], [b]) => a.localeCompare(b)).map(([relative, content]) => ({path: relative, sha256: hash(content), bytes: content.length}))};
  files.set('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  return files;
}

function hash(content) { return crypto.createHash('sha256').update(content).digest('hex'); }
function validateFiles(files, locales) {
  for (const [relative, content] of files) {
    if (relative.endsWith('.json')) JSON.parse(content.toString());
    if (!relative.endsWith('.liquid')) continue;
    const text = content.toString();
    if (/\bassets\/(?:img|css|js)\//.test(text)) throw new Error('Unconverted static asset URL in ' + relative);
    if (/\b(?:beauty|health)\.html\b/.test(text)) throw new Error('Unconverted cross-page URL in ' + relative);
    for (const match of text.matchAll(/'([^']+)'\s*\|\s*asset_url/g)) {
      if (!files.has('assets/' + match[1])) throw new Error('Missing asset ' + match[1] + ' in ' + relative);
    }
    for (const match of text.matchAll(/'rxsz\.([^']+)'\s*\|\s*t/g)) {
      for (const lang of LANGUAGES) {
        const keys = match[1].split('.');
        if (typeof locales[lang].rxsz[keys[0]]?.[keys[1]] !== 'string') throw new Error('Missing storefront translation ' + match[1] + ':' + lang);
      }
    }
    const schema = text.match(/{% schema %}([\s\S]*?){% endschema %}/);
    if (schema) JSON.parse(schema[1]);
  }
}

function build({check = false, outputDirectory = OUT} = {}) {
  const output = path.resolve(outputDirectory);
  const files = buildFiles();
  if (check) {
    for (const [relative, content] of files) {
      const destination = path.join(output, relative);
      if (!fs.existsSync(destination) || !fs.readFileSync(destination).equals(content)) throw new Error('Generated Shopify file is stale: ' + relative);
    }
    console.log(`Shopify overlay is current: ${files.size - 1} files; assets, translations, templates and checksums validated.`);
    return;
  }
  const oldManifest = fs.existsSync(path.join(output, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'))) : null;
  for (const entry of oldManifest?.files || []) {
    if (files.has(entry.path)) continue;
    const destination = path.resolve(output, entry.path);
    if (!destination.startsWith(output + path.sep)) throw new Error('Refusing an unsafe old manifest path.');
    if (fs.existsSync(destination)) fs.unlinkSync(destination);
  }
  for (const [relative, content] of files) {
    const destination = path.join(output, relative);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, content);
  }
  console.log(`Generated Shopify overlay: ${files.size - 1} files in shopify/. No demo checkout or fake product is included.`);
}

function mergeObjects(existing, incoming) {
  const result = {...existing};
  for (const [key, value] of Object.entries(incoming)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (result[key] != null && (typeof result[key] !== 'object' || Array.isArray(result[key]))) throw new Error('Cannot safely merge locale namespace: ' + key);
      result[key] = mergeObjects(result[key] || {}, value);
    } else result[key] = value;
  }
  return result;
}

function parseThemeJSON(buffer) {
  // Shopify can prefix generated locale JSON with a /* warning */ comment.
  // Strip comments without treating URLs or quoted text as comment markers.
  const text = buffer.toString().replace(/^\uFEFF/, '');
  let output = '', quoted = false, escaped = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index], next = text[index + 1];
    if (quoted) {
      output += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') { quoted = true; output += char; }
    else if (char === '/' && next === '*') {
      const end = text.indexOf('*/', index + 2);
      if (end < 0) throw new Error('Unclosed comment in theme JSON.');
      index = end + 1;
    } else if (char === '/' && next === '/') {
      const end = text.indexOf('\n', index + 2);
      index = end < 0 ? text.length : end;
      output += '\n';
    } else output += char;
  }
  return JSON.parse(output);
}

// Explicit opt-in merge into a complete, local copy of a theme. Unrelated
// files and every non-rxsz translation key are preserved. No remote actions.
function mergeTheme(directory) {
  const target = path.resolve(directory);
  if (target === OUT || !fs.existsSync(path.join(target, 'layout', 'theme.liquid'))) {
    throw new Error('--merge-theme requires a complete local theme copy with layout/theme.liquid. The overlay cannot be uploaded as a complete theme.');
  }
  const files = buildFiles();
  const localeDirectory = path.join(target, 'locales');
  const defaultFiles = fs.existsSync(localeDirectory) ? fs.readdirSync(localeDirectory).filter(name => /^[^.]+\.default\.json$/.test(name)) : [];
  if (defaultFiles.length !== 1) throw new Error('The base theme must have exactly one default storefront locale.');
  const defaultLanguage = defaultFiles[0].split('.')[0];
  const writes = new Map();
  for (const [relative, content] of files) {
    if (relative === 'manifest.json') continue;
    let destinationRelative = relative;
    if (relative.startsWith('locales/')) {
      const filename = path.basename(relative);
      const lang = filename.split('.')[0];
      const suffix = filename.endsWith('.schema.json') ? '.schema.json' : '.json';
      destinationRelative = 'locales/' + lang + (lang === defaultLanguage ? '.default' : '') + suffix;
      const destination = path.join(target, destinationRelative);
      const existing = fs.existsSync(destination) ? parseThemeJSON(fs.readFileSync(destination)) : {};
      writes.set(destinationRelative, Buffer.from(JSON.stringify(mergeObjects(existing, JSON.parse(content)), null, 2) + '\n'));
    } else if (relative.startsWith('templates/') && fs.existsSync(path.join(target, relative))) {
      const existing = parseThemeJSON(fs.readFileSync(path.join(target, relative)));
      const incoming = JSON.parse(content);
      if (existing.sections?.main && existing.sections.main.type !== incoming.sections.main.type) throw new Error('Existing RX SUBZERO template has an incompatible main section: ' + relative);
      const merged = {...existing, layout: incoming.layout, sections: {...existing.sections, main: {...incoming.sections.main, ...existing.sections?.main,
        settings: {...incoming.sections.main.settings, ...existing.sections?.main?.settings, audience: incoming.sections.main.settings.audience}}},
        order: existing.order?.includes('main') ? existing.order : ['main', ...(existing.order || [])]};
      writes.set(destinationRelative, Buffer.from(JSON.stringify(merged, null, 2) + '\n'));
    } else writes.set(destinationRelative, content);
  }
  // Themes whose primary language is neither EN nor ES still get an English
  // server-rendered fallback without changing their existing default language.
  if (!LANGUAGES.includes(defaultLanguage)) {
    for (const suffix of ['.json', '.schema.json']) {
      const destinationRelative = 'locales/' + defaultLanguage + '.default' + suffix;
      const destination = path.join(target, destinationRelative);
      const existing = fs.existsSync(destination) ? parseThemeJSON(fs.readFileSync(destination)) : {};
      const fallback = JSON.parse(files.get('locales/en.default' + suffix));
      writes.set(destinationRelative, Buffer.from(JSON.stringify(mergeObjects(existing, fallback), null, 2) + '\n'));
    }
  }
  // All content is parsed and all paths validated before any write takes place.
  for (const relative of writes.keys()) {
    if (!path.resolve(target, relative).startsWith(target + path.sep)) throw new Error('Refusing an unsafe theme destination.');
  }
  for (const [relative, content] of writes) {
    const destination = path.join(target, relative);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, content);
  }
  console.log(`Merged ${writes.size} RX SUBZERO files into the local theme copy. Existing theme translations and default language were preserved. No store was contacted.`);
}

const CRC_TABLE = Uint32Array.from({length: 256}, (_, number) => {
  let crc = number;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  return crc >>> 0;
});
function crc32(content) {
  let crc = 0xffffffff;
  for (const byte of content) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 255];
  return (crc ^ 0xffffffff) >>> 0;
}

function zipEntries(archive) {
  let end = -1;
  for (let offset = archive.length - 22; offset >= Math.max(0, archive.length - 65557); offset--) {
    if (archive.readUInt32LE(offset) === 0x06054b50) { end = offset; break; }
  }
  if (end < 0) throw new Error('Invalid source ZIP: missing directory.');
  const count = archive.readUInt16LE(end + 10);
  let offset = archive.readUInt32LE(end + 16);
  const entries = [];
  for (let index = 0; index < count; index++) {
    if (archive.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid source ZIP directory entry.');
    const length = archive.readUInt16LE(offset + 28), extra = archive.readUInt16LE(offset + 30), comment = archive.readUInt16LE(offset + 32);
    const name = archive.subarray(offset + 46, offset + 46 + length).toString('utf8');
    const local = archive.readUInt32LE(offset + 42);
    const method = archive.readUInt16LE(offset + 10), size = archive.readUInt32LE(offset + 20), uncompressed = archive.readUInt32LE(offset + 24);
    const mode = archive.readUInt32LE(offset + 38) >>> 16;
    if ((mode & 0xf000) === 0xa000) throw new Error('Source archive contains a symbolic link.');
    if (archive.readUInt32LE(local) !== 0x04034b50 || uncompressed > 50 * 1024 * 1024) throw new Error('Invalid source ZIP local entry.');
    const start = local + 30 + archive.readUInt16LE(local + 26) + archive.readUInt16LE(local + 28);
    const compressed = archive.subarray(start, start + size);
    const content = method === 0 ? compressed : method === 8 ? zlib.inflateRawSync(compressed, {maxOutputLength: 50 * 1024 * 1024}) : null;
    if (!content || content.length !== uncompressed || crc32(content) !== archive.readUInt32LE(offset + 16)) throw new Error('Source ZIP checksum failed: ' + name);
    entries.push({name, content});
    offset += 46 + length + extra + comment;
  }
  return entries;
}

function extractSource(archive, destination) {
  const entries = zipEntries(archive);
  const prefix = entries[0]?.name.split('/')[0] + '/';
  if (!prefix.includes(DAWN.sha)) throw new Error('Source ZIP is not the pinned Dawn commit.');
  let totalBytes = 0;
  for (const {name, content} of entries) {
    if (!name.startsWith(prefix)) throw new Error('Unexpected source ZIP root.');
    const relative = name.slice(prefix.length);
    if (!relative || relative.endsWith('/')) continue;
    if (relative.includes('\\') || path.isAbsolute(relative)) throw new Error('Unsafe source ZIP path.');
    const target = path.resolve(destination, relative);
    if (!target.startsWith(destination + path.sep)) throw new Error('Unsafe source ZIP destination.');
    totalBytes += content.length;
    if (totalBytes > 250 * 1024 * 1024) throw new Error('Source ZIP exceeds the theme size limit.');
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, content);
  }
}

function createThemeZip(directory) {
  const localParts = [], centralParts = [];
  let localOffset = 0, count = 0;
  const folders = new Set(['assets', 'blocks', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates', 'listings']);
  function add(relative) {
    const content = fs.readFileSync(path.join(directory, relative));
    const filename = Buffer.from(relative.replace(/\\/g, '/'));
    const compressed = zlib.deflateRawSync(content, {level: 9});
    const crc = crc32(content), time = (16 << 11) | (48 << 5) | 15, date = ((2026 - 1980) << 9) | (8 << 5) | 10;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt16LE(time, 10); local.writeUInt16LE(date, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(content.length, 22); local.writeUInt16LE(filename.length, 26);
    localParts.push(local, filename, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(0x0314, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12); central.writeUInt16LE(date, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(content.length, 24); central.writeUInt16LE(filename.length, 28);
    central.writeUInt32LE((0o100644 * 65536) >>> 0, 38); central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, filename);
    localOffset += local.length + filename.length + compressed.length;
    count++;
  }
  function walk(relative) {
    for (const entry of fs.readdirSync(path.join(directory, relative), {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink()) throw new Error('Theme package must not contain symbolic links.');
      const child = path.join(relative, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) add(child);
    }
  }
  for (const folder of [...folders].sort()) if (fs.existsSync(path.join(directory, folder))) walk(folder);
  if (count > 65535) throw new Error('Too many theme ZIP entries.');
  const central = Buffer.concat(centralParts), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(count, 8); end.writeUInt16LE(count, 10); end.writeUInt32LE(central.length, 12); end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, central, end]);
}

async function packageTheme() {
  build();
  const directory = path.join(ROOT, 'output', 'shopify');
  fs.mkdirSync(directory, {recursive: true});
  const archivePath = path.join(directory, `dawn-${DAWN.sha}.zip`);
  const archiveUrl = `https://codeload.github.com/Shopify/dawn/zip/${DAWN.sha}`;
  if (!fs.existsSync(archivePath)) {
    console.log(`Downloading official Shopify Dawn ${DAWN.version}, pinned commit ${DAWN.sha}.`);
    const response = await fetch(archiveUrl, {signal: AbortSignal.timeout(60000)});
    if (!response.ok) throw new Error('Dawn archive download failed: ' + response.status);
    const archive = Buffer.from(await response.arrayBuffer());
    // Validate all paths and checksums before retaining the downloaded source.
    zipEntries(archive);
    fs.writeFileSync(archivePath, archive);
  }
  const sourceArchive = fs.readFileSync(archivePath);
  const themeDirectory = fs.mkdtempSync(path.join(directory, 'theme-'));
  extractSource(sourceArchive, themeDirectory);
  const licenseFile = ['LICENSE.md', 'LICENSE', 'LICENSE.txt'].find(value => fs.existsSync(path.join(themeDirectory, value)));
  if (!licenseFile) throw new Error('Pinned Dawn source has no license file.');
  const license = fs.readFileSync(path.join(themeDirectory, licenseFile));
  if (!license.toString().includes('MIT')) throw new Error('Unexpected Dawn license.');
  fs.writeFileSync(path.join(themeDirectory, 'assets', 'rxsz-dawn-LICENSE.txt'), license);
  mergeTheme(themeDirectory);
  const zip = createThemeZip(themeDirectory);
  const entries = zipEntries(zip);
  for (const required of ['layout/theme.liquid', 'layout/rxsz.liquid', 'config/settings_schema.json', 'templates/index.json', 'templates/product.json', 'templates/cart.json', 'templates/page.rxsz-beauty.json', 'templates/page.rxsz-health.json', 'assets/rxsz-dawn-LICENSE.txt']) {
    if (!entries.some(entry => entry.name === required)) throw new Error('Missing complete-theme ZIP entry: ' + required);
  }
  if (entries.some(entry => !foldersForTheme(entry.name))) throw new Error('ZIP contains a wrapper directory or non-theme path.');
  const zipPath = path.join(directory, 'rxsubzero-shopify-theme.zip');
  fs.writeFileSync(zipPath, zip);
  fs.writeFileSync(path.join(directory, 'provenance.json'), JSON.stringify({source: 'Shopify/dawn', version: DAWN.version, commit: DAWN.sha, release: DAWN.release,
    sourceArchiveUrl: archiveUrl, sourceArchiveSha256: hash(sourceArchive), overlayManifestSha256: hash(fs.readFileSync(path.join(OUT, 'manifest.json'))),
    themeDirectory, zipPath, zipSha256: hash(zip), entries: entries.length, bytes: zip.length, license: 'MIT; preserved in assets/rxsz-dawn-LICENSE.txt'}, null, 2) + '\n');
  console.log(`Uploadable theme ZIP: ${zipPath} (${entries.length} files). Local Theme Check directory: ${themeDirectory}. No Shopify store was contacted.`);
  return {zipPath, themeDirectory};
}
function foldersForTheme(relative) { return /^(assets|blocks|config|layout|locales|sections|snippets|templates|listings)\//.test(relative); }

async function main() {
  const mergeIndex = process.argv.indexOf('--merge-theme');
  if (process.argv.includes('--package')) await packageTheme();
  else if (mergeIndex >= 0) {
    if (!process.argv[mergeIndex + 1]) throw new Error('Provide the local theme directory after --merge-theme.');
    mergeTheme(process.argv[mergeIndex + 1]);
  } else build({check: process.argv.includes('--check')});
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = {buildFiles, build, validateFiles, mergeTheme, parseThemeJSON, packageTheme, createThemeZip, zipEntries, normalizeSource, DAWN};
