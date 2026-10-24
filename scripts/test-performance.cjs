const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const {responsive,sourceFor}=require('../catalog/responsive-images.cjs');
test('responsive image URLs preserve the source and never crop or change aspect ratio',()=>{
 for(const p of require('../assets/base-products.json').products)for(const photo of Object.values(p.photos)){
  const d=new JSDOM(`<img ${responsive(photo.source,'240px')}>`).window.document;
  const img=d.querySelector('img');
  for(const entry of img.srcset.split(', ')){
   const [url,width]=entry.split(' '),u=new URL(url,'https://restandard-2025.netlify.app');
   assert.equal(u.searchParams.get('url'),sourceFor(photo.source));
   assert.equal(u.searchParams.get('fit'),'contain');assert(!u.searchParams.has('h'));
   assert(Number(u.searchParams.get('w'))<=photo.width);assert.equal(width,u.searchParams.get('w')+'w');
  }d.defaultView.close();
 }
 assert.equal(responsive('https://unapproved.example/a.png','100vw'),'');
});
test('home prioritizes the actual opening image and keeps all 32 BASE links',()=>{
 const d=new JSDOM(fs.readFileSync('index.html','utf8')).window.document;
 assert.equal(d.querySelectorAll('link[rel=preload][as=image]').length,0);
 assert.equal(d.querySelectorAll('img[fetchpriority=high]').length,1);
 assert.equal(d.querySelector('.intro-slide img').getAttribute('fetchpriority'),'high');
 assert.equal(d.querySelectorAll('[data-product-marquee]>a[href^="https://restandard.base.ec/items/"]').length,require('../assets/base-products.json').collection.flat().length+require('../assets/base-products.json').lookbook.length);
 assert([...d.querySelectorAll('[data-product-marquee] img')].every(i=>i.getAttribute('loading')==='lazy'&&i.srcset&&i.width&&i.height));
 assert(!d.querySelector('script[src*="bootstrap"],script[src*="init-sections"],link[href*="font-awesome"]'));
 d.defaultView.close();
});
test('all seven corrected dates have matching published-source evidence, list and Article metadata',()=>{
 const manifest=require('../news_src/manifest.json');
 for(const item of require('../docs/news-date-evidence-2026-10-20.json').articles){
  assert.equal(item.display[0].date,item.verified);
  assert.equal(manifest.find(p=>p.slug===item.slug).date,item.verified);
  const d=new JSDOM(fs.readFileSync(`news/${item.slug}/index.html`,'utf8')).window.document;
  assert.equal(d.querySelector('time[datetime]').getAttribute('datetime'),item.verified);
  const article=[...d.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent)).find(s=>s['@type']==='Article');
  assert.equal(article.datePublished,item.verified);d.defaultView.close();
 }
});
