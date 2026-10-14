'use strict';
// Export reviewed ImageGen masters. Sharp only resizes/crops and encodes;
// all product content corrections happen in ImageGen against the camera refs.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'source-assets/geometry/manifest.json'), 'utf8'));
const replacements = new Map();
async function encode(master, name, width, height, quality = 88) {
  const source = path.join(ROOT, master);
  const metadata = await sharp(source).metadata();
  if (metadata.width < width || metadata.height < height) throw new Error('Master too small: ' + master);
  const buffer = await sharp(source).resize(width, height, {fit: 'cover', position: 'centre', withoutEnlargement: true}).webp({quality, effort: 6}).toBuffer();
  fs.writeFileSync(path.join(ROOT, 'assets/img', name), buffer);
  return buffer;
}
async function main() {
  for (const item of manifest.images) {
    const portrait = item.slot === 'hero-editorial';
    const bytes = await encode(item.master, item.output, portrait ? 1120 : 1200, portrait ? 1400 : 1000);
    fs.writeFileSync(path.join(ROOT, 'assets/img', item.file), bytes);
    replacements.set(item.file, item.output);
    if (item.slot === 'hero-life' || portrait) {
      const small = item.file.replace(/(?:1200|1120)\.webp$/, '600.webp');
      const nextSmall = small.replace('.webp', '-geometry.webp');
      const smallBytes = await encode(item.master, nextSmall, 600, portrait ? 750 : 500, 84);
      fs.writeFileSync(path.join(ROOT, 'assets/img', small), smallBytes);
      replacements.set(small, nextSmall);
    }
    const view = {'hero-life': 0, 'hero-editorial': 1, 'ritual-prepare': 2, 'ritual-store': 3}[item.slot];
    if (view !== undefined) {
      const thumb = `${item.page}-explorer-thumb-${view}${view === 3 ? '-integrated' : ''}.webp`;
      const nextThumb = `${item.page}-explorer-thumb-${view}-geometry.webp`;
      const thumbBytes = await encode(item.master, nextThumb, 160, portrait ? 200 : 133, 84);
      fs.writeFileSync(path.join(ROOT, 'assets/img', thumb), thumbBytes);
      if (view === 3) fs.writeFileSync(path.join(ROOT, 'assets/img', `${item.page}-explorer-thumb-3.webp`), thumbBytes);
      replacements.set(thumb, nextThumb);
    }
    // Keep old public URLs consistent and prevent reuse of the old mold.
    if (item.slot === 'offer' || item.slot === 'ritual-store') {
      fs.writeFileSync(path.join(ROOT, 'assets/img', `${item.page}-${item.slot}-authentic.webp`), bytes);
    }
    if (item.slot === 'product') fs.writeFileSync(path.join(ROOT, 'assets/img', `${item.page}-story-authentic.webp`), bytes);
    if (item.slot === 'hero-life') {
      fs.writeFileSync(path.join(ROOT, 'assets/img', `${item.page}-hero-authentic.webp`), bytes);
      fs.writeFileSync(path.join(ROOT, 'assets/img', `${item.page}-hero-mobile-authentic.webp`), bytes);
    }
  }
  for (const relative of ['beauty.html', 'health.html', 'assets/partials/commerce.html']) {
    const file = path.join(ROOT, relative);
    let content = fs.readFileSync(file, 'utf8');
    for (const [oldName, nextName] of replacements) content = content.replaceAll('assets/img/' + oldName, 'assets/img/' + nextName);
    fs.writeFileSync(file, content);
  }
  console.log(`Exported ${manifest.images.length} primary photos, 4 responsive images and 8 thumbnails; updated page consumers and legacy URLs.`);
}
main().catch(error => {console.error(error); process.exitCode = 1;});
