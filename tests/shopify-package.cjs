'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {buildFiles, build, validateFiles, mergeTheme, parseThemeJSON, createThemeZip, zipEntries, normalizeSource} = require('../scripts/build-shopify.cjs');

function temporary(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rxsz-shopify-tests-'));
  t.after(() => {
    const resolved = path.resolve(directory);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert.ok(path.basename(resolved).startsWith('rxsz-shopify-tests-'));
    fs.rmSync(resolved, {recursive: true, force: true});
  });
  return directory;
}

test('Windows and Linux text copies produce identical package bytes and hashes while binary assets stay intact', () => {
  const lf = Buffer.from('line one\nline two\n');
  const crlf = Buffer.from('line one\r\nline two\r\n');
  for (const extension of ['js', 'css', 'html', 'json', 'cjs', 'md', 'liquid']) {
    assert.deepEqual(normalizeSource('source.' + extension, crlf), lf);
    assert.deepEqual(normalizeSource('source.' + extension, lf), lf);
  }
  const binary = Buffer.from([0, 13, 10, 255, 13, 10, 137]);
  for (const extension of ['webp', 'png', 'zip', 'woff2']) assert.deepEqual(normalizeSource('asset.' + extension, binary), binary);
  const files = buildFiles();
  const manifest = JSON.parse(files.get('manifest.json'));
  const root = path.resolve(__dirname, '..');
  for (const entry of manifest.sourceFiles) {
    const content = normalizeSource(entry.path, fs.readFileSync(path.join(root, entry.path)));
    assert.equal(crypto.createHash('sha256').update(content).digest('hex'), entry.sha256);
    if (/^assets\/(css|js|img)\//.test(entry.path) && !entry.path.endsWith('/config.js')) {
      assert.deepEqual(files.get('assets/rxsz-' + path.basename(entry.path)), content);
    }
  }
  for (const [relative, content] of files) if (/\.(?:js|css|liquid|json)$/.test(relative)) assert.ok(!content.includes(Buffer.from('\r\n')), relative);
});

test('Shopify output uses native templates, live catalog and locale forms, with linked assets and checksums', () => {
  const files = buildFiles();
  for (const audience of ['beauty', 'health']) {
    const template = JSON.parse(files.get(`templates/page.rxsz-${audience}.json`));
    assert.equal(template.layout, 'rxsz');
    assert.equal(template.sections.main.settings.audience, audience);
    assert.equal(template.sections.main.type, 'rxsz-authentic-landing');
    const snippet = files.get(`snippets/rxsz-${audience}.liquid`).toString();
    assert.match(snippet, /form 'product', rxsz_product/);
    assert.match(snippet, /form 'localization'/);
    assert.match(snippet, /name="language_code"/);
    assert.doesNotMatch(snippet, /data-lang="(?:en|es)"|(?:beauty|health)\.html/);
    assert.match(snippet, /money_with_currency/);
    assert.doesNotMatch(snippet, /USD 49\.90/);
  }
  const section = files.get('sections/rxsz-authentic-landing.liquid').toString();
  assert.match(section, /mode:\s*"shopify"/);
  assert.doesNotMatch(section, /mode:\s*"demo"/);
  assert.match(section, /product:\s*{% if rxsz_product != blank %}/);
  assert.match(section, /{% else %}null{% endif %}/);
  assert.match(section, /routes\.root_url \| append: '\/' \| replace: '\/\/', '\/'/);
  assert.match(section, /routes\.root_url \| append: '\/checkout' \| replace: '\/\/', '\/'/);
  // Structural guard, not a simulated Liquid execution: catalog strings use
  // Shopify's JSON filter plus literal captures that remove HTML script markers.
  assert.match(section, /{% capture rxsz_json_lt %}\\u003c{% endcapture %}/);
  assert.match(section, /rxsz_product\.title \| json \| replace: '<', rxsz_json_lt/);
  assert.match(section, /variant\.title \| json \| replace: '<', rxsz_json_lt/);
  assert.match(section, /policy\.title \| json \| replace: '<', rxsz_json_lt/);
  const schema = JSON.parse(section.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
  assert.equal(schema.settings.find(setting => setting.id === 'product').type, 'product');
  assert.equal(schema.settings.find(setting => setting.id === 'beauty_page').type, 'page');
  assert.equal(schema.settings.find(setting => setting.id === 'health_page').type, 'page');
  const layout = files.get('layout/rxsz.liquid').toString();
  assert.match(layout, /{{ content_for_header }}/);
  assert.match(layout, /{{ content_for_layout }}/);
  const manifest = JSON.parse(files.get('manifest.json'));
  for (const entry of manifest.files) {
    assert.equal(crypto.createHash('sha256').update(files.get(entry.path)).digest('hex'), entry.sha256);
  }
});

test('missing assets and storefront translations fail before generating a broken package', () => {
  const files = buildFiles();
  const locales = {
    en: JSON.parse(files.get('locales/en.default.json')),
    es: JSON.parse(files.get('locales/es.json'))
  };
  const missingAsset = new Map(files);
  missingAsset.delete('assets/rxsz-logo-official.png');
  assert.throws(() => validateFiles(missingAsset, locales), /Missing asset/);
  delete locales.es.rxsz.beauty.hero_title_1;
  assert.throws(() => validateFiles(files, locales), /Missing storefront translation/);
});

test('checking generated output catches stale files without altering the generated directory', t => {
  const directory = temporary(t);
  build({outputDirectory: directory});
  build({check: true, outputDirectory: directory});
  const file = path.join(directory, 'assets', 'rxsz-app.js');
  fs.appendFileSync(file, '\n/* stale fixture */');
  assert.throws(() => build({check: true, outputDirectory: directory}), /Generated Shopify file is stale/);
  assert.ok(fs.readFileSync(file, 'utf8').endsWith('/* stale fixture */'));
});

for (const primary of ['en', 'es', 'fr']) {
  test(`merge preserves a ${primary} primary locale, theme translations and existing catalog/page settings`, t => {
    const directory = temporary(t);
    for (const folder of ['layout', 'locales', 'templates']) fs.mkdirSync(path.join(directory, folder));
    fs.writeFileSync(path.join(directory, 'layout', 'theme.liquid'), 'existing theme layout');
    fs.writeFileSync(path.join(directory, 'locales', `${primary}.default.json`), '/* Shopify generated warning */' + JSON.stringify({general: {preserved: 'original', url: 'https://example.test/a//b'}}));
    fs.writeFileSync(path.join(directory, 'locales', `${primary}.default.schema.json`), JSON.stringify({labels: {preserved: 'original'}}));
    fs.writeFileSync(path.join(directory, 'templates', 'page.rxsz-beauty.json'), JSON.stringify({layout: 'rxsz', sections: {main: {type: 'rxsz-authentic-landing', settings: {audience: 'beauty', product: 'rx-subzero-real', beauty_page: 'beauty-real', health_page: 'wellness-real'}}}, order: ['main']}));
    mergeTheme(directory);
    const names = fs.readdirSync(path.join(directory, 'locales'));
    assert.equal(names.filter(name => name.endsWith('.default.json')).length, 1);
    const locale = JSON.parse(fs.readFileSync(path.join(directory, 'locales', `${primary}.default.json`)));
    assert.equal(locale.general.preserved, 'original');
    assert.equal(locale.general.url, 'https://example.test/a//b');
    assert.equal(typeof locale.rxsz.beauty.hero_title_1, 'string');
    const template = JSON.parse(fs.readFileSync(path.join(directory, 'templates', 'page.rxsz-beauty.json')));
    assert.equal(template.sections.main.settings.product, 'rx-subzero-real');
    assert.equal(template.sections.main.settings.health_page, 'wellness-real');
    assert.equal(fs.readFileSync(path.join(directory, 'layout', 'theme.liquid'), 'utf8'), 'existing theme layout');
  });
}

test('merge rejects an incomplete theme before writing; generated JSON comments preserve quoted URLs', t => {
  const directory = temporary(t);
  assert.throws(() => mergeTheme(directory), /complete local theme copy/);
  assert.deepEqual(fs.readdirSync(directory), []);
  assert.deepEqual(parseThemeJSON('/* generated */ {"url":"https://example.test/a//b", "value":1} // end'), {url: 'https://example.test/a//b', value: 1});
});

test('theme ZIP has theme directories in its root and excludes source, secrets and wrapper folders', t => {
  const directory = temporary(t);
  fs.mkdirSync(path.join(directory, 'layout'));
  fs.mkdirSync(path.join(directory, 'templates'));
  fs.writeFileSync(path.join(directory, 'layout', 'theme.liquid'), '{{ content_for_layout }}');
  fs.writeFileSync(path.join(directory, 'templates', 'index.json'), '{"sections":{},"order":[]}');
  fs.writeFileSync(path.join(directory, '.env'), 'not-a-theme-file');
  fs.writeFileSync(path.join(directory, 'README.md'), 'source file');
  const zip = createThemeZip(directory);
  const names = zipEntries(zip).map(entry => entry.name);
  assert.deepEqual(names, ['layout/theme.liquid', 'templates/index.json']);
});
