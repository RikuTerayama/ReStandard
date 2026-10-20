'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {JSDOM}=require('jsdom');
const {repair,jsonLD,generateSitemap,files}=require('./seo-pages.cjs');
const {xmlUrls}=require('./audit-seo.cjs');
const {siteUrl}=require('../catalog/config.json');
test('quoted article text cannot break JSON-LD or create script elements',()=>{
  const html='<!doctype html><html><head><title>old</title><meta name="description" content="A &quot;quote&quot; &amp; detail"><meta property="og:image" content="https://example.com/photo.jpg"><link rel="canonical" href="'+siteUrl+'/news/test/"></head><body><h1>A &quot;quote&quot; &lt;/script&gt;&lt;script&gt;alert(1)</h1><time datetime="2025-09-23T20:07:54">2025-09-23</time><p>Body stays untouched.</p></body></html>';
  const output=repair(html,'news/test/index.html'),d=new JSDOM(output).window.document;
  const schemas=[...d.querySelectorAll('script')].map(s=>JSON.parse(s.textContent));
  assert.equal(schemas.length,3);assert.equal(schemas[1].headline,d.querySelector('h1').textContent);assert(!schemas[1].datePublished);assert(!schemas[1].dateModified);assert.equal(output.split('<body>')[1],html.split('<body>')[1]);assert.equal(repair(output,'news/test/index.html'),output);
  const dated=new JSDOM(repair(html.replace('2025-09-23T20:07:54','2025-09-23T20:07:54+09:00'),'news/test/index.html'));
  assert.equal(JSON.parse(dated.window.document.querySelectorAll('script[type="application/ld+json"]')[1].textContent).datePublished,'2025-09-23T20:07:54+09:00');dated.window.close();
  assert.equal(JSON.parse(jsonLD({x:'</script>&"'})).x,'</script>&"');
});
test('sitemap discovers added articles, excludes noindex, and never invents lastmod',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'restandard-seo-'));
  try{
    for(const f of files()){const full=path.join(tmp,f);fs.mkdirSync(path.dirname(full),{recursive:true});fs.copyFileSync(f,full);}
    const make=(slug,robots)=>{fs.mkdirSync(path.join(tmp,'news',slug));fs.writeFileSync(path.join(tmp,'news',slug,'index.html'),`<head><link rel="canonical" href="${siteUrl}/news/${slug}/"><meta name="robots" content="${robots}"></head>`);};
    make('new-published','index,follow');make('private-preview','noindex,follow');
    const xml=generateSitemap(tmp),urls=xmlUrls(xml);assert(urls.includes(siteUrl+'/news/new-published/'));assert(!urls.includes(siteUrl+'/news/private-preview/'));assert(!urls.includes(siteUrl+'/404.html'));assert(!xml.includes('lastmod'));assert.equal(urls.length,new Set(urls).size);
  }finally{if(!tmp.startsWith(os.tmpdir()+path.sep)||!path.basename(tmp).startsWith('restandard-seo-'))throw Error('UNSAFE_TEMP_PATH');fs.rmSync(tmp,{recursive:true,force:true});}
});
test('all published News schemas agree with displayed headlines and use canonical News URL',()=>{
  for(const f of files().filter(f=>f.startsWith('news/'))){const dom=new JSDOM(fs.readFileSync(f,'utf8')),d=dom.window.document;const schemas=[...d.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent));const article=schemas.find(s=>s['@type']==='Article');assert.equal(article.headline,d.querySelector('h1').textContent.replace(/\s+/g,' ').trim());assert.equal(schemas.find(s=>s['@type']==='BreadcrumbList').itemListElement[1].item,siteUrl+'/news.html');dom.window.close();}
});
