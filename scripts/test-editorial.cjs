const {chromium}=require('playwright');
const {fork}=require('node:child_process');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {connectHome}=require('../catalog/home-links.cjs');
const {normalize}=require('../catalog/normalize.cjs');
const snapshot=require('../catalog/public-snapshot.json'),config=require('../catalog/config.json');
const manifest=require('../news_src/manifest.json');
const origin='http://127.0.0.1:4182';
const server=fork('scripts/preview-catalog.cjs',[],{env:{...process.env,PORT:'4182'},silent:true});
const pages=['index.html','about.html','vision.html','news.html','location.html','contact.html','sitemap.html','404.html'];
const articles=[...new Set(manifest.map(a=>`news/${a.slug}/`))];
const report={layouts:[],articles:[],interactions:[]};
let browser;
(async()=>{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:'chrome',headless:true});
 fs.mkdirSync('.catalog-private/editorial',{recursive:true});
 const home=connectHome(fs.readFileSync('index.html','utf8'),normalize(snapshot,config).products);
 assert.equal((home.match(/href="https:\/\/restandard.base.ec\/items\//g)||[]).length,32);
 assert(!/<h2 class="section-title"><a href="\/products\//.test(home));
 assert(home.includes('href="/products/"'));
 for(const width of [320,375,768,1440,2560]){
  const page=await browser.newPage({viewport:{width,height:1000}});let errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  for(const file of pages){
   errors=[];const response=await page.goto(origin+'/'+file,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
   await page.waitForTimeout(250);
   const layout=await page.evaluate(()=>{
    const main=document.querySelector('main'),footer=document.querySelector('.rs-footer');
    return {width:innerWidth,scroll:document.documentElement.scrollWidth,main:document.querySelectorAll('main').length,
     font:getComputedStyle(document.querySelector('h1')).fontFamily,
     footerAfterContent:footer.getBoundingClientRect().top>=main.getBoundingClientRect().bottom-1,
     headingColors:[...document.querySelectorAll('.section-title,.section-title span')].map(e=>getComputedStyle(e).color)};
   });
   assert(layout.scroll<=width+1,`${file} overflow ${width}`);assert.equal(layout.main,1,file);
   assert(layout.footerAfterContent,`${file} footer overlaps`);assert(layout.font.includes(file==='index.html'?'Mincho':'Arial'),file);
   assert(!layout.headingColors.includes('rgb(255, 255, 255)'),`${file} white heading`);
   assert.equal(errors.length,0,`${file}: ${errors}`);
   if(width<=768){
    const button=page.locator('.rs-nav .rs-menu-toggle');await button.click();
    assert.equal(await button.getAttribute('aria-expanded'),'true');assert(await page.locator('.rs-nav a[href="/products/"]').isVisible());
    await page.keyboard.press('Escape');assert.equal(await button.getAttribute('aria-expanded'),'false');
   }
   if(file==='news.html'){await page.waitForFunction(()=>document.querySelectorAll('.news-card').length>0);assert.equal(await page.locator('.news-card').count(),manifest.length);}
   if([375,1440].includes(width))await page.screenshot({path:`.catalog-private/editorial/${file}-${width}.png`});
   report.layouts.push({file,width,passed:true});
  }
  await page.close();
 }
 for(const width of [375,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}});
  for(const file of articles){const response=await page.goto(origin+'/'+file,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200,file);assert.equal(await page.locator('.rs-nav').count(),1);assert(await page.locator('h1').isVisible());assert(await page.locator('main nav a[href="/news.html"]').count()>0,`${file} breadcrumb link`);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),file);report.articles.push({file,width,passed:true});}
  await page.goto(origin+'/news/rockmount/',{waitUntil:'domcontentloaded'});await page.screenshot({path:`.catalog-private/editorial/article-${width}.png`});
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:375,height:900}});
 await page.goto(origin+'/about.html');await page.locator('.rs-menu-toggle').click();await page.locator('[data-lang-btn="en"]').click();
 await page.waitForFunction(()=>document.documentElement.lang==='en');
 assert.equal(await page.locator('html').getAttribute('lang'),'en');
 assert(await page.getByText('Our Philosophy',{exact:true}).isVisible());
 await page.locator('[data-lang-btn="ja"]').click();assert(await page.getByText('私たちの理念',{exact:true}).isVisible());report.interactions.push('Mobile menu, Escape/focus and JA/EN switching');
 await page.goto(origin+'/contact.html');const formURL=new URL(await page.locator('iframe[id^="JotForm"]').getAttribute('src'));assert.equal(formURL.origin+formURL.pathname,'https://form.jotform.com/252014412896455');
 await page.goto(origin+'/location.html');assert((await page.locator('.map-container iframe').getAttribute('src')).startsWith('https://www.google.com/maps/embed'));report.interactions.push('Existing contact form and map retained; no submission');
 await page.close();
 const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:900}});const plain=await noJs.newPage();await plain.goto(origin+'/about.html');await plain.locator('.rs-nav-group summary').first().click();assert(await plain.locator('.rs-nav a[href="/products/"]').isVisible());assert(await plain.getByText('私たちの理念',{exact:true}).isVisible());report.interactions.push('Navigation and content visible without JavaScript');await noJs.close();
 fs.writeFileSync('.catalog-private/editorial/verification.json',JSON.stringify(report,null,2));
 console.log(`${report.layouts.length} layouts, ${report.articles.length} article layouts passed. ${report.interactions.join('; ')}. 32 home photographs link to BASE.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();server.kill();});
