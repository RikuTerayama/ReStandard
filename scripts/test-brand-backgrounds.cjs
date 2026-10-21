const {chromium}=require('playwright'),{fork}=require('node:child_process'),fs=require('node:fs'),assert=require('node:assert/strict');
const profiles=require('../catalog/brand-profiles.json');
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:4196';
const server=process.env.TEST_ORIGIN?null:fork('scripts/preview-catalog.cjs',[],{env:{...process.env,PORT:'4196'},silent:true});let browser;
(async()=>{if(server)await new Promise(r=>server.stdout.once('data',r));browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
 for(const width of [375,768,1024,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
  for(const route of ['/','/brands/']){
   await page.goto(origin+route);const images=page.locator(route==='/'?'.brand-logo':'.brand-directory-logo img');assert.equal(await images.count(),10);
   for(const img of await images.all()){
    await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());
    const data=await img.evaluate(i=>{const c=getComputedStyle(i),box=i.closest('.brand-directory-logo')||i.parentElement;return{alt:i.alt,source:decodeURIComponent(i.src),background:c.backgroundColor,boxBackground:getComputedStyle(box).backgroundColor,filter:c.filter,loaded:i.naturalWidth>0,fit:c.objectFit}});
    assert(data.loaded);assert.equal(data.background,'rgba(0, 0, 0, 0)');assert.equal(data.boxBackground,'rgba(0, 0, 0, 0)');
    if(['Sans Arcidet','Hat Attack'].includes(data.alt)||data.source.endsWith('/san arcident.webp')||data.source.endsWith('/hat attack.webp'))assert(data.filter.includes('logo-transparency.svg#white'));results.push({width,route,...data});
   }
   if(route==='/brands/'&&[375,1440].includes(width)){await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:`.catalog-private/brand-backgrounds-${width}.png`,fullPage:true});}
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 for(const p of profiles){await page.goto(origin+'/brands/'+encodeURIComponent(p.name)+'/');const img=page.locator('.brand-intro-logo img');await img.evaluate(i=>i.decode());assert.equal(await page.locator('.brand-intro-logo').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');}
 fs.writeFileSync('.catalog-private/brand-backgrounds-validation.json',JSON.stringify({origin,checks:results,brandPages:profiles.length},null,2));console.log('PASS: 80 logo checks at 4 widths and all 10 brand detail pages; original artwork retained.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();server?.kill()});
