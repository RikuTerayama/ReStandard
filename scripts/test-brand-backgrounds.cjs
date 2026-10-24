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
    assert.equal(data.filter,'none','Transparency must belong to the asset, not CSS');
    const alpha=await img.evaluate(i=>{const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;let clear=0,ink=0;for(let j=3;j<pixels.length;j+=4){if(pixels[j]===0)clear++;if(pixels[j]>128)ink++;}return{clear,ink,pixels:pixels.length/4,currentSrc:i.currentSrc};});
    assert(alpha.clear>alpha.pixels*.1,'Source pixels must contain transparency');assert(alpha.ink>20,'Logo artwork must remain visible');
    assert(!alpha.currentSrc.includes('/.netlify/images'),'Serve transparent originals without CDN background conversion');results.push({width,route,...data,alpha});
   }
   if(route==='/'&&[375,1440].includes(width))await page.locator('#brands').screenshot({path:`.catalog-private/home-brand-backgrounds-${width}.png`});
   if(route==='/brands/'&&[375,1440].includes(width)){await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:`.catalog-private/brand-backgrounds-${width}.png`,fullPage:true});}
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 for(const p of profiles){await page.goto(origin+'/brands/'+encodeURIComponent(p.name)+'/');const img=page.locator('.brand-intro-logo img');await img.evaluate(i=>i.decode());assert.equal(await page.locator('.brand-intro-logo').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');}
 fs.writeFileSync('.catalog-private/brand-backgrounds-validation.json',JSON.stringify({origin,checks:results,brandPages:profiles.length},null,2));console.log('PASS: 80 logo checks at 4 widths and all 10 brand detail pages; original artwork retained.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();server?.kill()});
