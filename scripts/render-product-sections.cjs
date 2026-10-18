// Render static links so products remain accessible without JavaScript.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets/base-products.json'), 'utf8'));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const toolbar=(id,caption)=>`<div class="marquee-toolbar"><p>${caption}</p><button type="button" data-marquee-toggle="${id}" aria-pressed="false" aria-controls="${id}-motion" hidden><span aria-hidden="true">Ⅱ</span> <span data-marquee-label>自動スクロールを停止</span></button></div>`;
function card(entry, wearing = false) {
  const product = catalog.products.find(p => p.id === entry.id);
  const photo = product.photos[entry.photo];
  const alt = product.name + (wearing ? ' 着用イメージ' : ' 商品写真');
  return `          <a href="${escape(product.url)}" target="_blank" rel="noopener noreferrer" style="--image-ratio: ${photo.width / photo.height}">
            <img src="${escape(photo.file)}" width="${photo.width}" height="${photo.height}" alt="${escape(alt)}" loading="eager" decoding="async" draggable="false">
          </a>`;
}
const collection = `  <section id="collection">
    <h2 class="section-title">Collection</h2>${toolbar('collection','毎日の装いをつくる、ニットとスカート。')}
    <p class="sr-only">厳選された欧米アパレルブランドの商品をご紹介します。画像を選ぶとBASEの商品ページが新しいタブで開きます。</p>
    <div class="band">
      <div class="collection-wrapper collection-panel" id="collection-motion">
${catalog.collection.map((row, i) => `        <div class="collection-row">
          <div class="collection-track" data-product-marquee data-direction="${i ? 'right' : 'left'}" data-pixels-per-second="32">
${row.map(entry => card(entry)).join('\n')}
          </div>
        </div>`).join('\n')}
      </div>
    </div>
  </section>`;
const lookbook = `  <section id="lookbook">
    <h2 class="section-title">Lookbook</h2>${toolbar('lookbook','色と柄を重ねる、スタイリングのヒント。')}
    <p class="lookbook-more"><a href="/lookbook.html">すべてのスタイリングを見る ↗</a></p>
    <p class="sr-only">季節のコーディネートをご紹介します。画像を選ぶと着用商品のBASEページが新しいタブで開きます。</p>
    <div class="lookbook-wrapper lookbook-panel" id="lookbook-motion">
      <div class="lookbook-container">
        <div class="lookbook-track" data-product-marquee data-direction="left" data-pixels-per-second="24">
${catalog.lookbook.map(entry => card(entry, true)).join('\n')}
        </div>
      </div>
    </div>
  </section>`;
const file = path.join(root, 'index.html');
let html = fs.readFileSync(file, 'utf8');
for (const [id, markup] of [['collection', collection], ['lookbook', lookbook]]) {
  const section = new RegExp(`  <section id="${id}">[\\s\\S]*?<\\/section>`);
  if (!section.test(html)) throw new Error(`Missing section: ${id}`);
  html = html.replace(section, markup);
}
fs.writeFileSync(file, html);
