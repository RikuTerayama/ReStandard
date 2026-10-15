/* Browser regression checks. Requires Playwright and a local Chrome installation.
   Run: node scripts/test-product-marquee.cjs (or supply Playwright via NODE_PATH). */
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets/base-products.json'), 'utf8'));
const sections = ['collection','lookbook'].map(id => html.match(new RegExp(`<section id="${id}">[\\s\\S]*?<\\/section>`))[0]).join('\n');
const fixture = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/css/style.css"><link rel="stylesheet" href="/css/lookbook-override.css"><link rel="stylesheet" href="/css/product-marquee.css">
${sections}<script src="/js/product-marquee.js" defer></script>`;
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp'};
const server = http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname === '/') {res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);return;}
  const file = path.resolve(root, '.'+pathname);
  if (!file.startsWith(root+path.sep)) {res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data);});
});
let browser;
async function testMobileTouch(browser, url) {
  // Use a separate mobile session with real compositor timing. Mouse events and
  // the deterministic animation clock above cannot reproduce native touch input.
  const mobile = await browser.newPage({viewport:{width:375,height:812},hasTouch:true,isMobile:true,deviceScaleFactor:3});
  await mobile.goto(url,{waitUntil:'load'});
  await mobile.evaluate(()=>{
    window.clicked=[];
    document.addEventListener('click',event=>{
      const a=event.target.closest('a');
      if(a){window.clicked.push({href:a.href,prevented:event.defaultPrevented});event.preventDefault();}
    });
  });
  const touch = await mobile.context().newCDPSession(mobile);
  const position = track=>track.evaluate(t=>new DOMMatrix(getComputedStyle(t).transform).m41);
  for (const index of [0,1,2]) {
    const track=mobile.locator('[data-product-marquee]').nth(index);
    await track.locator('..').scrollIntoViewIfNeeded();
    for(const delta of [-120,120]) {
      const box=await track.boundingBox();
      const start={x:delta<0?260:100,y:box.y+box.height/2};
      const before=await position(track);
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:0}]});
      for(const fraction of [0.2,0.4,0.7,1]) {
        await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+delta*fraction,y:start.y,id:0}]});
        await mobile.waitForTimeout(30);
      }
      assert(await track.evaluate(t=>t.classList.contains('is-dragging')),'Touch remains active after capture transfers from image to track');
      const after=await position(track);
      const width=await track.evaluate(t=>t.firstElementChild.getBoundingClientRect().width);
      const error=((after-before-delta+width/2)%width+width)%width-width/2;
      assert(Math.abs(error)<6,`All rows follow the full swipe in both directions: ${error}`);
      await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      assert(!(await track.evaluate(t=>t.classList.contains('is-dragging'))));
      const released=await position(track);await mobile.waitForTimeout(150);
      assert.notEqual(await position(track),released,'Automatic movement resumes after a swipe');
    }
    assert.equal(await mobile.evaluate(()=>window.clicked.length),0,'Swiping must not open a product');
    const target=await track.locator('a').evaluateAll(as=>{
      const a=as.find(a=>{const r=a.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;});
      const r=a.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,href:a.href};
    });
    await mobile.touchscreen.tap(target.x,target.y);
    await mobile.waitForFunction(()=>window.clicked.length>0,null,{timeout:2000});
    assert.deepEqual(await mobile.evaluate(()=>window.clicked.pop()),{href:target.href,prevented:false},'A tap after swiping still opens the correct product');
    const box=await track.boundingBox(), y=box.y+box.height/2;
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:260,y,id:0}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:160,y,id:0}]});
    await mobile.waitForTimeout(30);
    await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    assert(!(await track.evaluate(t=>t.classList.contains('is-dragging'))),'Touch cancellation releases the row');
    const cancelled=await position(track);await mobile.waitForTimeout(150);
    assert.notEqual(await position(track),cancelled,'Automatic movement resumes after cancellation');
  }
  await mobile.locator('[data-product-marquee]').first().locator('..').scrollIntoViewIfNeeded();
  await mobile.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  const beforeY=await mobile.evaluate(()=>scrollY+document.body.scrollTop);
  const box=await mobile.locator('[data-product-marquee]').first().boundingBox();
  const y=box.y+box.height/2;
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y,id:0}]});
  for(const dy of [20,50,90]){
    await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y:y-dy,id:0}]});
    await mobile.waitForTimeout(30);
  }
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await mobile.waitForFunction(before=>scrollY+document.body.scrollTop>before+10,beforeY,{timeout:2000}).catch(async error=>{console.log({beforeY,y,state:await mobile.evaluate(()=>({scrollY,bodyScroll:document.body.scrollTop,docHeight:document.documentElement.scrollHeight,bodyHeight:document.body.scrollHeight,bodyClient:document.body.clientHeight}))});throw error;});
  await mobile.close();
}
async function main() {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch({channel:'chrome',headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:1100},hasTouch:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  // Drive real animation callbacks deterministically to verify multiple complete
  // cycles without a long wall-clock wait. No production test hooks are needed.
  await page.addInitScript(()=>{
    let time=0, id=0;
    const callbacks=new Map();
    window.requestAnimationFrame=callback=>{callbacks.set(++id,callback);return id;};
    window.cancelAnimationFrame=id=>callbacks.delete(id);
    window.advance=milliseconds=>{
      for(let elapsed=0;elapsed<milliseconds;elapsed+=20){
        time+=20;
        const batch=[...callbacks.values()];callbacks.clear();batch.forEach(callback=>callback(time));
      }
    };
  });
  await page.goto(url,{waitUntil:'load'});
  const advance = ms=>page.evaluate(ms=>window.advance(ms),ms);
  const positions = ()=>page.locator('[data-product-marquee]').evaluateAll(ts=>ts.map(t=>new DOMMatrix(getComputedStyle(t).transform).m41));
  const geometry = ()=>page.locator('[data-product-marquee]').evaluateAll(ts=>ts.map(t=>{
    const group=t.firstElementChild, g=group.getBoundingClientRect(), view=t.parentElement.getBoundingClientRect();
    return {width:g.width, gap:parseFloat(getComputedStyle(group).paddingRight), distance:t.children[1].getBoundingClientRect().left-g.left, coverage:t.getBoundingClientRect().right-view.right, left:t.getBoundingClientRect().left-view.left, viewport:view.width, animation:getComputedStyle(t).animationName, copies:t.children.length, height:t.getBoundingClientRect().height, images:[...group.querySelectorAll('img')].map(i=>({loaded:i.complete&&i.naturalWidth>0,width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height,fit:getComputedStyle(i).objectFit}))};
  }));
  for(const width of [320,375,480,768,1024,1440,2560,3840]){
    await page.setViewportSize({width,height:1100});
    await page.waitForTimeout(50);await advance(100);
    for(const g of await geometry()){
      assert.equal(g.animation,'none');
      assert(Math.abs(g.width-g.distance)<0.5,'Repeated groups must include the trailing gap');
      assert(g.coverage>=-0.5 && g.left<=0.5,`Viewport must stay covered at ${width}: ${JSON.stringify(g)}`);
      assert(g.images.every(i=>i.loaded&&i.width>0&&i.width<=width&&Math.abs(i.height-g.height)<0.5&&i.fit==='contain'),'All images visible without distortion');
    }
    const panel=await page.locator('#lookbook .lookbook-panel').evaluate(el=>({height:el.getBoundingClientRect().height,content:el.firstElementChild.getBoundingClientRect().height,padding:parseFloat(getComputedStyle(el).paddingTop)+parseFloat(getComputedStyle(el).paddingBottom)}));
    assert(Math.abs(panel.height-panel.content-panel.padding)<1,'Panel follows image height without a large empty area');
    const before=await positions();await advance(1000);const after=await positions();
    assert(after[0]<before[0]&&after[1]>before[1]&&after[2]<before[2],'All three rows move in the intended direction');
  }
  // Validate every displayed image against the verified product mapping.
  const actual = await page.locator('.marquee-group:not([data-marquee-clone]) a').evaluateAll(as=>as.map(a=>({url:a.href,file:a.querySelector('img').getAttribute('src')})));
  const expected=[...catalog.collection.flat(),...catalog.lookbook].map(entry=>{
    const p=catalog.products.find(p=>p.id===entry.id);return {url:p.url,file:p.photos[entry.photo].file};
  });
  assert.deepEqual(actual,expected);
  assert.equal(await page.locator('[data-marquee-clone] a:not([tabindex="-1"])').count(),0);
  // More than two full cycles, checking coverage across the wrap boundary.
  let wraps=0, previous=await positions();
  for(let second=0;second<320;second++){
    await advance(1000);const next=await positions();
    if(next[0]>previous[0]) wraps++;
    previous=next;
    for(const g of await geometry()) assert(g.coverage>=-0.5&&g.left<=0.5,'No empty tail at cycle boundary');
  }
  assert(wraps>=2,'At least two complete loops exercised');
  await page.setViewportSize({width:375,height:900});await page.waitForTimeout(50);await advance(100);
  await testMobileTouch(browser, url);
  for(const index of [0,1,2]){
    const track=page.locator('[data-product-marquee]').nth(index);
    await track.scrollIntoViewIfNeeded();
    const box=await track.boundingBox();
    const y=box.y+box.height/2;
    await page.mouse.move(210,y);await page.mouse.down();await page.mouse.move(90,y,{steps:5});
    assert(await track.evaluate(t=>t.classList.contains('is-dragging')),'Drag starts');
    await page.mouse.up();
    assert(!(await track.evaluate(t=>t.classList.contains('is-dragging'))),'Drag releases');
    const before=await positions();await advance(1000);assert.notEqual((await positions())[index],before[index],'Resumes after drag');
    // Cancellation and lost capture must not leave a row frozen.
    await page.mouse.move(210,y);await page.mouse.down();await page.mouse.move(120,y);
    await track.evaluate(t=>t.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1,bubbles:true})));
    await page.mouse.up();
    assert(!(await track.evaluate(t=>t.classList.contains('is-dragging'))));
    const cancelled=await positions();await advance(1000);assert.notEqual((await positions())[index],cancelled[index]);
  }
  // Normal taps/clicks are native anchors, including duplicate images.
  await page.evaluate(()=>{
    window.clicked=[];
    document.addEventListener('click',event=>{const a=event.target.closest('a');if(a){window.clicked.push({href:a.href,prevented:event.defaultPrevented});event.preventDefault();}});
  });
  await page.locator('#lookbook').scrollIntoViewIfNeeded();
  const target=await page.locator('#lookbook a').evaluateAll(as=>{
    const a=as.find(a=>{const r=a.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;});
    const r=a.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,href:a.href};
  });
  await page.touchscreen.tap(target.x,target.y);
  await page.waitForFunction(()=>window.clicked.length>0,null,{polling:20,timeout:2000});
  assert.deepEqual(await page.evaluate(()=>window.clicked.pop()),{href:target.href,prevented:false});
  // Simulate returning from browser history and changing motion preference.
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  await advance(1000);
  const returned=await positions();await advance(1000);assert.notDeepEqual(await positions(),returned);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(50);await advance(100);
  assert.deepEqual(await positions(),[0,0,0]);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(50);await advance(1000);
  assert.notDeepEqual(await positions(),[0,0,0]);
  // A late/failed image cannot hold initialization hostage.
  const delayed=await browser.newPage();
  await delayed.route('**/image/base-products/**',route=>route.abort());
  await delayed.goto(url,{waitUntil:'load'});
  assert.equal(await delayed.locator('[data-marquee-ready]').count(),3);
  const old=await delayed.locator('[data-product-marquee]').first().getAttribute('style');
  await delayed.waitForTimeout(150);
  assert.notEqual(await delayed.locator('[data-product-marquee]').first().getAttribute('style'),old);
  await delayed.close();
  // Static fallback keeps every product available without scripts.
  const noJS=await browser.newPage({javaScriptEnabled:false,viewport:{width:320,height:800}});
  await noJS.goto(url,{waitUntil:'load'});
  assert.equal(await noJS.locator('[data-product-marquee] a').count(),32);
  await noJS.close();
  assert.deepEqual(errors,[]);
  console.log('PASS: 8 widths, all 32 product mappings, 2+ cycles, real touch swipes on all rows, drag/release/cancel, touch link, pageshow, reduced motion, failed images, no-JS fallback.');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
