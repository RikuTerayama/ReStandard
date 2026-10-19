'use strict';
// Reviewed BASE IDs, never inferred from article titles or slugs.
const fs=require('node:fs');
const mapping=require('../assets/news-products.json');
const snapshot=require('../catalog/public-snapshot.json');
const cache=require('../assets/base-products.json').products.flatMap(p=>Object.values(p.photos));
const {esc}=require('../catalog/render.cjs');
function productCard(id){
 if(id===null)return '<a class="news-product-card news-product-alternative" href="https://restandard.base.ec/categories/7071409" target="_blank" rel="noopener noreferrer"><div class="news-product-copy"><span class="news-product-brand">ERIBE</span><h3>ERIBÉの掲載アイテム</h3><p>この記事のP4312・Mulberryは、現在のBASE掲載商品との一致を確認できていません。</p><span class="news-product-action">BASEで同ブランドの商品を見る <span aria-hidden="true">↗</span></span></div></a>';
 const p=snapshot.items.find(p=>String(p.id)===String(id)&&p.visible);if(!p)throw Error('Missing published news product: '+id);
 const img=p.images[0];const local=cache.find(c=>c.source===img.url);const brand=p.name.includes('Rockmount')?'Rockmount':p.name.includes('Harley')?'Harley of Scotland':'ERIBE';
 return `<a class="news-product-card" data-base-id="${p.id}" href="https://restandard.base.ec/items/${p.id}" target="_blank" rel="noopener noreferrer"><div class="news-product-image"><img src="${esc(local?'/'+local.file:img.url)}" alt="${esc(p.name)}" width="240" height="300" loading="lazy" decoding="async"></div><div class="news-product-copy"><span class="news-product-brand">${brand}</span><h3>${esc(p.name)}</h3><span class="news-product-action">BASEで商品を見る <span aria-hidden="true">↗</span></span></div></a>`;
}
function render(){
 for(const [slug,ids] of Object.entries(mapping)){
  const file=`news/${slug}/index.html`;let html=fs.readFileSync(file,'utf8');
  // The legacy embed has nested divs: consume a balanced block, not a lazy regex.
  for(const found of [...html.matchAll(/<div class="stores-card"/g)].reverse()){
   const tail=html.slice(found.index);let depth=0,end;
   for(const tag of tail.matchAll(/<\/?div\b[^>]*>/g)){depth+=tag[0].startsWith('</')?-1:1;if(depth===0){end=found.index+tag.index+tag[0].length;break;}}
   if(!end)throw Error('Unbalanced store embed: '+slug);html=html.slice(0,found.index)+html.slice(end);
  }
  html=html.replace(/<!-- news-products:start -->[\s\S]*?<!-- news-products:end -->\s*/g,'');
  const section=`<!-- news-products:start --><section class="news-products" aria-label="記事で紹介したアイテム"><p class="news-products-title">記事から、ワードローブへ。</p><div class="news-product-grid">${ids.map(productCard).join('')}</div></section><!-- news-products:end -->`;
  // Place near the beginning, after publication information, so shopping is discoverable.
  html=html.replace(/(<p>\s*<time\b[^>]*>[\s\S]*?<\/time>\s*<\/p>)/,`$1\n${section}`);
  if(!html.includes('news-products:start'))throw Error('News insertion point missing: '+slug);
  html=html.replace(/<link[^>]*href="\/css\/news-products.css[^>]*>\s*/g,'').replace('</head>','<link rel="stylesheet" href="/css/news-products.css?v=20261019-1">\n</head>');
  if(/restandard\.stores\.jp/.test(html))throw Error('Unreviewed legacy purchase link: '+slug);
  fs.writeFileSync(file,html);
 }
 console.log(`Updated ${Object.keys(mapping).length} news articles with reviewed BASE links.`);
}
if(require.main===module)render();module.exports={render,productCard};
