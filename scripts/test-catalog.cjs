'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {fetchSnapshot}=require('../catalog/base-client.cjs');
const {normalize,labelledFacts}=require('../catalog/normalize.cjs');
const {productPage}=require('../catalog/render.cjs');
const {createCatalogService}=require('../catalog/server.cjs');
const time='2026-10-16T00:00:00.000Z',now=()=>Date.parse(time);
const config={shopUrl:'https://restandard.base.ec',siteUrl:'https://restandard-2025.netlify.app',phase1Confirmed:true,pilotApproved:true,slugs:{}};
// Synthetic contract fixtures, never included in the site or actual product data.
const item=(id=1,more={})=>({id,type:'normal',name:'TEST ONLY',detail:'-ブランド：Example\n-素材：Cotton 100%\n-カラー：Blue\n-サイズ：M',identifier:'TEST-SKU',price:12300,stock:2,visible:true,sales_status:'item_now_on_sale',images:[{id:12,url:'https://example.com/a.jpg'},{id:11,url:'https://example.com/b.jpg'}],variations:[{id:21,name:'Blue / M',stock:0},{id:22,name:'Blue / L',stock:2}],categories:[],...more});
const snapshot=(items=[item()],more={})=>({schemaVersion:1,source:'base-api-v2',complete:true,fetchedAt:time,shopUrl:config.shopUrl,shopVisible:true,items,...more});
const graph=html=>[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
test('BASE IDs remain separate despite matching name/code; variants and image order preserved',()=>{
  const data=normalize(snapshot([item(),item(2)]),config);
  assert.equal(data.products.length,2);assert.notEqual(data.products[0].url,data.products[1].url);
  assert.deepEqual(data.products[0].images.map(i=>i.id),['12','11']);assert.equal(data.products[0].variants[0].stock,0);
  assert.equal(data.products[0].modelGroup,null);
});
test('unknown facts are null; explicit conflicts are flagged instead of guessed',()=>{
  const a=labelledFacts('-素材：Wool\n-素材：Cotton\nスコットランドのブランドです。');
  assert.equal(a.facts.material,null);assert.equal(a.facts.origin,null);assert.equal(a.provenance.material.conflict,true);
  assert.equal(labelledFacts('-素材：Wool。\n-素材：Wool').facts.material,'Wool');
});
test('stable registered slug survives renamed product; duplicate slugs rejected',()=>{
  const data=normalize(snapshot([item(1,{name:'NEW'})]),{slugs:{'1':'fixed-name'}});assert.equal(data.products[0].url,'/products/fixed-name/');
  assert.throws(()=>normalize(snapshot([item(),item(2)]),{slugs:{1:'same',2:'same'}}),/DUPLICATE_SLUG/);
});
test('changed price, description, images, stock and visibility replace prior values',()=>{
  const a=normalize(snapshot(),config),b=normalize(snapshot([item(1,{price:20000,stock:0,detail:'changed',images:[],visible:false})]),config);
  assert.notEqual(a.products[0].fingerprint,b.products[0].fingerprint);assert.equal(b.products[0].price,20000);
  assert.equal(b.products[0].images.length,0);assert.equal(b.products[0].published,false);assert.equal(b.products[0].description,'changed');
});
test('shop closure hides all products',()=>assert.equal(normalize(snapshot([item()],{shopVisible:false}),config).products[0].published,false));
test('API uses only authenticated GET reads and complete two-pass pagination',async()=>{
  const calls=[];
  const data=await fetchSnapshot({token:'test-secret',shopUrl:config.shopUrl,now:()=>new Date(time),fetchImpl:async(url,options)=>{
    calls.push({url,options});assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,'Bearer test-secret');
    return {ok:true,json:async()=>url.endsWith('/api/user')?{shop_url:config.shopUrl,able_to_business:true}:url.includes('offset=100')?[item(101)]:Array.from({length:100},(_,i)=>item(i+1))};
  }});
  assert.equal(data.items.length,101);assert.equal(calls.length,5);assert(calls.every(c=>!c.url.includes('visible=')));
});
test('inconsistent scans and partial failure reject snapshot; no invented deletions',async()=>{
  let count=0;const fake=async url=>({ok:true,json:async()=>url.endsWith('/api/user')?{shop_url:config.shopUrl,able_to_business:true}:[item(++count)]});
  await assert.rejects(fetchSnapshot({token:'t',shopUrl:config.shopUrl,fetchImpl:fake}),/CHANGED_DURING_SYNC/);
  await assert.rejects(fetchSnapshot({token:'t',shopUrl:config.shopUrl,fetchImpl:async()=>({ok:false,status:401})}),/HTTP_401/);
});
test('wrong shop rejected, credentials required, unsafe image protocol rejected',async()=>{
  await assert.rejects(fetchSnapshot({token:'',shopUrl:config.shopUrl}),/TOKEN_MISSING/);
  await assert.rejects(fetchSnapshot({token:'t',shopUrl:config.shopUrl,fetchImpl:async()=>({ok:true,json:async()=>({shop_url:'https://wrong.base.ec',able_to_business:true})})}),/SHOP_MISMATCH/);
  assert.throws(()=>normalize(snapshot([item(1,{images:[{url:'javascript:alert(1)'}]})])),/INVALID_IMAGE_URL/);
});
test('price/currency/stock and external purchase URL agree with valid Offer; zero stock supported',()=>{
  const data=normalize(snapshot([item(1,{stock:0})]),config),p=data.products[0];
  const html=productPage(p,data,{siteUrl:config.siteUrl,now:now()});const schema=graph(html)[0];
  assert.equal(schema.offers.price,p.price);assert.equal(schema.offers.priceCurrency,'JPY');
  assert.equal(schema.offers.url,p.baseUrl);assert.equal(schema.offers.availability,'https://schema.org/OutOfStock');
  assert(html.includes('売り切れ'));assert(html.includes('¥12,300'));assert(!schema.aggregateRating);assert(!schema.mpn);
});
test('expired, missing price, unknown stock and public-page sources omit Offer',()=>{
  for(const [snap,at] of [[snapshot(),now()+61000],[snapshot([item(1,{price:null})]),now()],[snapshot([item(1,{stock:null})]),now()],[snapshot(undefined,{source:'base-public-pilot',complete:false}),now()]]){
    const data=normalize(snap,config);assert(!graph(productPage(data.products[0],data,{siteUrl:config.siteUrl,now:at}))[0].offers);
  }
});
test('unsafe product content is escaped in both markup and JSON-LD',()=>{
  const data=normalize(snapshot([item(1,{name:'</script><script>alert(1)</script>',detail:'<img src=x onerror=alert(1)>'})]),config);
  const html=productPage(data.products[0],data,{siteUrl:config.siteUrl,now:now()});
  assert(!html.includes('<script>alert(1)</script>'));assert(!html.includes('<img src=x'));assert.equal(graph(html)[0].name,data.products[0].name);
});
test('real 404 for hidden/deleted and unknown routes; only public products in sitemap',async()=>{
  const handle=createCatalogService({config,load:async()=>snapshot([item(),item(2,{visible:false})]),now});
  for(const path of ['/products/base-2/','/products/base-999/','/brands/unknown/','/products/a/b/'])assert.equal((await handle(path)).status,404);
  const xml=(await handle('/catalog-sitemap.xml')).body;assert(xml.includes('/products/base-1/'));assert(!xml.includes('base-2'));
});
test('filters work without JS; encoded brand/category segments and canonical redirects',async()=>{
  const handle=createCatalogService({config,load:async()=>snapshot([item(1,{detail:'-ブランド：A / B\n-カテゴリ：スカート'})]),now});
  assert.equal((await handle('/products')).status,301);
  assert.equal((await handle('/brands/A%20%2F%20B/')).status,200);
  assert((await handle('/products/?brand=absent')).body.includes('0 items'));
  assert((await handle('/products/?sort=price-asc')).body.includes('noindex,follow'));
});
test('cache expires and failure returns 503 with no stale item/offer, even without JS',async()=>{
  let tick=now(),fail=false;const logs=[];
  const handle=createCatalogService({config,now:()=>tick,logger:{error:s=>logs.push(s)},load:async()=>{if(fail)throw new Error('secret not to log');return snapshot();}});
  assert.equal((await handle('/products/base-1/')).status,200);tick+=61000;fail=true;
  const res=await handle('/products/base-1/');assert.equal(res.status,503);assert(!res.body.includes('TEST ONLY'));assert(!res.body.includes('12300'));
  assert.equal(res.headers['Cache-Control'],'no-store');assert(!logs.join().includes('secret not to log'));assert(logs.join().includes(time));
});
test('new snapshot removes deleted product; closed shop has no public items',async()=>{
  let tick=now(),items=[item()];
  const handle=createCatalogService({config,now:()=>tick,load:async()=>snapshot(items,{fetchedAt:new Date(tick).toISOString()})});
  assert.equal((await handle('/products/base-1/')).status,200);items=[];tick+=61000;assert.equal((await handle('/products/base-1/')).status,404);
});
test('production remains gated while Phase 1 and pilot validation are pending',async()=>{
  let calls=0;const handle=createCatalogService({config:{...config,phase1Confirmed:false},load:async()=>{calls++;return snapshot();}});
  assert.equal((await handle('/products/')).status,503);assert.equal(calls,0);
});
test('manual public snapshot retains the published JPY price without timestamps; stock and Offer remain conservative',async()=>{
  const actualNow=Date.now;
  try {
    Date.now=()=>now();
    const publicData=snapshot([item(1,{stock:null,publicAvailability:'sold-out'})],{source:'base-public-store',complete:false,publicListingComplete:true});
    const handle=createCatalogService({config:{...config,dataSource:'public-store'},load:async()=>publicData});
    const before=await handle('/products/base-1/');assert.equal(before.status,200);assert(before.body.includes('¥12,300'));assert(before.body.includes('売り切れ'));assert(before.body.includes('data-stock-expires='));
    assert(!graph(before.body)[0].offers);
    Date.now=()=>now()+86400001;
    const after=await handle('/products/base-1/');assert.equal(after.status,200);assert(after.body.includes('¥12,300'));assert(!after.body.includes('売り切れ'));assert(!after.body.includes('確認時の価格'));assert(!after.body.includes('class="sync-time"'));assert(!after.body.includes('BASEの商品説明（'));assert(!graph(after.body)[0].offers);
  } finally {Date.now=actualNow;}
});
test('public sold-out filtering, original brand spelling, and reviewed evidence invalidation',async()=>{
  const data=snapshot([item(124701019,{detail:'-ブランド：ERIBÉ（エリベ）',publicAvailability:'sold-out'})],{source:'base-public-store',complete:false,publicListingComplete:true,fetchedAt:new Date().toISOString()});
  const handle=createCatalogService({config,preview:true,load:async()=>data});
  assert.equal((await handle('/brands/ERIBE/')).status,200);
  assert((await handle('/products/?stock=sold-out')).body.includes('1 items'));
  const changed=normalize(snapshot([item(124701944,{detail:'NEW DESCRIPTION WITHOUT OLD EVIDENCE'})]),config);
  assert.equal(changed.products[0].brand,null);
});
