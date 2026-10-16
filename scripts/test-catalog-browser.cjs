const {chromium}=require('playwright');
const {fork}=require('node:child_process');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {normalize}=require('../catalog/normalize.cjs');
const config=require('../catalog/config.json');
const snapshot=require('../catalog/public-snapshot.json');
const data=normalize(snapshot,config);
const pilotProducts=data.products.filter(p=>config.pilotIds.includes(p.id));
const port=4179,origin=`http://127.0.0.1:${port}`;
const server=fork(path.join(__dirname,'preview-catalog.cjs'),[],{env:{...process.env,PORT:String(port)},silent:true});
let browser;
const result={widths:[],products:[],checks:[],localTimings:[]};
(async()=>{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',()=>reject(new Error('Preview server exited')));});
  browser=await chromium.launch({channel:'chrome',headless:true});
  await fs.mkdir('.catalog-private/screenshots',{recursive:true});
  for(const width of [320,375,768,1440,2560]){
    const page=await browser.newPage({viewport:{width,height:900}});
    const failures=[];page.on('pageerror',error=>failures.push(error.message));
    await page.goto(origin+'/products/');
    assert.equal(await page.locator('.product-card').count(),data.products.length);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Listing fits ${width}`);
    for(const p of pilotProducts){
      const t=performance.now();await page.goto(origin+p.url,{waitUntil:'domcontentloaded'});
      assert.equal(await page.locator('h1').textContent(),p.name);
      assert.equal(await page.locator('.gallery-slide').count(),p.images.length);
      assert.deepEqual(await page.locator('.gallery-slide').evaluateAll(links=>links.map(a=>a.href)),p.images.map(i=>i.url));
      assert.equal(await page.locator('.purchase-link').getAttribute('href'),p.baseUrl);
      assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),config.siteUrl+p.url);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Detail fits ${width}`);
      assert.equal(await page.locator('.gallery-slide img').first().evaluate(img=>getComputedStyle(img).objectFit),'contain');
      if(width===375||width===1440){
        await page.locator('.gallery-slide img').first().evaluate(img=>img.decode());
        await page.screenshot({path:`.catalog-private/screenshots/${p.id}-${width}.png`,fullPage:false});
      }
      if(width===375)result.localTimings.push({id:p.id,domReadyMs:Math.round(performance.now()-t)});
    }
    assert.deepEqual(failures,[]);result.widths.push(width);await page.close();
  }
  const mobile=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await mobile.goto(origin+pilotProducts[0].url);
  const track=mobile.locator('.gallery-track');await track.scrollIntoViewIfNeeded();
  const touch=await mobile.context().newCDPSession(mobile),box=await track.boundingBox();
  const y=Math.min(box.y+box.height/2,650);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:300,y,id:1}]});
  for(const x of [260,210,150,100,55]){await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y,id:1}]});await mobile.waitForTimeout(30);}
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.waitForTimeout(500);
  assert(await track.evaluate(el=>el.scrollLeft>el.clientWidth*.75),'Native mobile swipe advances gallery');
  assert.equal(await mobile.locator('dialog[open]').count(),0,'Swipe does not open zoom');
  await mobile.locator('[data-image-index="0"]').click();await mobile.waitForTimeout(450);
  await mobile.locator('.gallery-slide').first().tap();assert(await mobile.locator('dialog').evaluate(el=>el.open));
  await mobile.locator('[data-close-zoom]').click();assert(!await mobile.locator('dialog').evaluate(el=>el.open));
  result.checks.push('Real mobile touch swipe and tap-to-zoom');await mobile.close();
  const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width:375,height:812}});
  await nojs.goto(origin+'/products/');await nojs.locator('select[name=brand]').selectOption('Rockmount');await nojs.getByRole('button',{name:'絞り込む'}).click();
  assert.equal(await nojs.locator('.product-card').count(),data.products.filter(p=>p.brand==='Rockmount').length);await nojs.locator('.product-card-image').first().click();assert.equal(await nojs.locator('h1').textContent(),data.products.find(p=>p.brand==='Rockmount').name);
  assert.equal((await nojs.goto(origin+'/products/no-such-product/')).status(),404);
  result.checks.push('JavaScript disabled: GET filters, native product links, real 404');await nojs.close();
  const page=await browser.newPage();
  for(const p of pilotProducts){
    await page.goto(origin+p.url);
    for(const img of await page.locator('.gallery-slide img').all()){
      await img.scrollIntoViewIfNeeded();await img.evaluate(img=>img.decode());assert(await img.evaluate(img=>img.naturalWidth>0));
    }
    result.products.push({id:p.id,images:p.images.length,allImagesLoaded:true,metadata:true,purchaseLink:true});
  }
  result.checks.push('All representative-product images decode successfully and preserve source order');
  await fs.writeFile('.catalog-private/browser-test-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();server.kill();});
