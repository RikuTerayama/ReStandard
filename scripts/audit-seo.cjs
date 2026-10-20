'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const {XMLParser,XMLValidator}=require('fast-xml-parser');
const {files,route}=require('./seo-pages.cjs');
const {createCatalogService}=require('../catalog/server.cjs');
const {siteUrl}=require('../catalog/config.json');
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
function xmlUrls(xml){if(XMLValidator.validate(xml)!==true)throw Error('INVALID_SITEMAP_XML');return [].concat(new XMLParser().parse(xml).urlset.url||[]).map(e=>e.loc);}
async function audit({base=path.resolve(__dirname,'../.catalog-dist'),origin=null,write=true}={}){
  const service=createCatalogService(),catalogUrls=xmlUrls((await service('/catalog-sitemap.xml')).body);
  const paths=[...files(base).map(route),...catalogUrls.map(u=>new URL(u).pathname)];
  const pages=[];
  let cursor=0;
  await Promise.all(Array.from({length:origin?4:1},async()=>{while(cursor<paths.length){
    const p=paths[cursor++];let html,status=200,headers={},final=p;
    if(origin){const response=await fetch(origin+p,{signal:AbortSignal.timeout(30000)});html=await response.text();status=response.status;headers=Object.fromEntries(response.headers);final=new URL(response.url).pathname;}
    else if(catalogUrls.includes(siteUrl+p)){const response=await service(p);html=response.body;status=response.status;headers=response.headers;}
    else html=fs.readFileSync(path.join(base,p==='/'?'index.html':p.endsWith('/')?p.slice(1)+'index.html':p.slice(1)),'utf8');
    const dom=new JSDOM(html,{url:siteUrl+p}),d=dom.window.document,errors=[];
    const check=(condition,message)=>{if(!condition)errors.push(message);};
    const title=norm(d.title),description=d.querySelector('meta[name="description"]')?.content,canonical=d.querySelector('link[rel="canonical"]')?.href;
    const robots=d.querySelector('meta[name="robots"]')?.content||'',noindex=/noindex/i.test(robots+' '+(headers['x-robots-tag']||''));
    check(status===200,'HTTP_'+status);check(final===p,'NONCANONICAL_REDIRECT');
    check(d.querySelectorAll('title').length===1&&title,'TITLE');check(d.querySelectorAll('meta[name="description"]').length===1&&description,'DESCRIPTION');
    check(d.querySelectorAll('link[rel="canonical"]').length===1&&canonical===siteUrl+p,'CANONICAL');
    check(d.head.querySelector('title')&&d.head.querySelector('link[rel="canonical"]')&&d.head.querySelector('meta[name="description"]'),'METADATA_IN_HEAD');
    check(noindex===(p==='/404.html'),'ROBOTS');check(d.querySelectorAll('h1').length===1,'H1');
    check(d.querySelector('meta[name="viewport"]')?.content.includes('width=device-width'),'VIEWPORT');
    check(d.documentElement.lang==='ja','INITIAL_LANGUAGE');
    check(d.querySelectorAll('[data-lang-btn]').length===2,'LANGUAGE_CONTROLS');
    check(d.querySelectorAll('footer .rs-footer-group').length===4,'FOOTER');
    check([...d.images].every(i=>i.hasAttribute('alt')),'MISSING_ALT');
    const schemas=[];for(const s of d.querySelectorAll('script[type="application/ld+json"]')){try{schemas.push(JSON.parse(s.textContent));}catch(e){errors.push('JSON_LD: '+e.message);}}
    for(const s of schemas){
      check(s['@context']==='https://schema.org','SCHEMA_CONTEXT');
      check(!JSON.stringify(s).includes('+81-3-1234-5678')&&!JSON.stringify(s).includes('SearchAction'),'PLACEHOLDER_SCHEMA');
      if(s['@type']==='Organization'){check(!s.telephone&&!s.openingHours,'UNVERIFIED_COMPANY_FIELD');check(s.name==='ReStandard'&&s.url===siteUrl+'/','ORGANIZATION');check(JSON.stringify(s.sameAs)===JSON.stringify([...d.querySelectorAll('[aria-labelledby="footer-follow"] a')].map(a=>a.href)),'ORGANIZATION_LINKS');}
      if(['Article','NewsArticle'].includes(s['@type'])){check(s.headline===norm(d.querySelector('h1').textContent),'ARTICLE_HEADLINE');check(s.description===description,'ARTICLE_DESCRIPTION');check(s.url===canonical&&s.mainEntityOfPage['@id']===canonical,'ARTICLE_URL');if(s.datePublished)check(s.datePublished===d.querySelector('time[datetime]')?.getAttribute('datetime')&&/(?:Z|[+-]\d{2}:\d{2})$/.test(s.datePublished),'ARTICLE_DATE');check(!s.dateModified,'UNVERIFIED_MODIFICATION_DATE');}
      if(s['@type']==='BreadcrumbList'){check(s.itemListElement.length>=2&&s.itemListElement.every((v,i)=>v.position===i+1&&v.name&&v.item?.startsWith(siteUrl+'/')),'BREADCRUMB');check(s.itemListElement.at(-1).item===canonical,'BREADCRUMB_CANONICAL');}
      if(s['@type']==='Product'){check(norm(s.name)===norm(d.querySelector('h1').textContent)&&s.url===canonical,'PRODUCT_IDENTITY');check(JSON.stringify(s.image)===JSON.stringify([...d.querySelectorAll('.gallery-slide')].map(a=>a.href)),'PRODUCT_IMAGES');check(!s.review&&!s.aggregateRating&&!s.gtin,'INVENTED_PRODUCT_DATA');if(s.offers){check(s.offers.url===d.querySelector('.purchase-link').href&&s.offers.priceCurrency==='JPY','OFFER');check(norm(d.querySelector('.product-info .price').textContent).includes('¥'+Number(s.offers.price).toLocaleString('ja-JP')),'OFFER_PRICE');}}
    }
    const links=[...d.querySelectorAll('a[href]')].map(a=>a.href).filter(h=>h.startsWith(siteUrl+'/'));
    const resources=[...d.images].map(i=>i.getAttribute('src')).filter(Boolean);
    const schemaImages=schemas.flatMap(s=>[].concat(s.image||[])).map(i=>typeof i==='string'?i:i.url).filter(Boolean);
    const ids=[...d.querySelectorAll('[id]')].map(e=>e.id);
    pages.push({path:p,status,canonical,title,description,indexable:!noindex,h1:norm(d.querySelector('h1')?.textContent),schemas:schemas.map(s=>s['@type']),imageCount:d.images.length,links,resources:[...resources,...schemaImages],ids,errors});dom.window.close();
  }}));
  pages.sort((a,b)=>a.path.localeCompare(b.path));
  const byPath=new Map(pages.map(p=>[p.path,p]));
  const resolve=p=>byPath.get(p)||byPath.get(p==='/'?p:p.replace(/\/$/,'')+'.html')||byPath.get(p.replace(/\/index.html$/,'/'));
  const inbound=new Set();
  for(const p of pages){
    for(const h of p.links){const u=new URL(h),target=resolve(u.pathname);if(target){inbound.add(target.path);if(u.hash&&u.hash!=='#'&&!target.ids.includes(decodeURIComponent(u.hash.slice(1))))p.errors.push('BROKEN_FRAGMENT: '+h);}else if(!fs.existsSync(path.join(base,decodeURIComponent(u.pathname))))p.errors.push('BROKEN_LINK: '+h);}
    for(const h of p.resources){const u=new URL(h,siteUrl+p.path);if(u.origin===siteUrl){const pathname=u.pathname==='/.netlify/images'?u.searchParams.get('url'):u.pathname;if(pathname&&!fs.existsSync(path.join(base,decodeURIComponent(pathname))))p.errors.push('MISSING_IMAGE: '+h);}}
    if(p.indexable&&pages.some(a=>a!==p&&a.indexable&&a.title===p.title))p.errors.push('DUPLICATE_TITLE');
  }
  for(const p of pages.filter(p=>p.indexable))if(!inbound.has(p.path))p.errors.push('ORPHAN_PAGE');
  const staticXml=origin?await fetch(origin+'/sitemap-pages.xml').then(r=>{if(r.status!==200)throw Error('SITEMAP_HTTP');return r.text()}):fs.readFileSync(path.join(base,'sitemap-pages.xml'),'utf8');
  const catalogXml=origin?await fetch(origin+'/catalog-sitemap.xml').then(r=>r.text()):(await service('/catalog-sitemap.xml')).body;
  const urls=[...xmlUrls(staticXml),...xmlUrls(catalogXml)];
  const errors=[];
  if(urls.length!==new Set(urls).size)errors.push('DUPLICATE_SITEMAP_URL');
  if(JSON.stringify([...urls].sort())!==JSON.stringify(pages.filter(p=>p.indexable).map(p=>p.canonical).sort()))errors.push('SITEMAP_COVERAGE');
  if(/<lastmod>/.test(staticXml+catalogXml))errors.push('LASTMOD_REQUIRES_VERIFIED_SOURCE');
  const report={checkedAt:new Date().toISOString(),origin:origin||'local-production-build',totalPages:pages.length,indexable:pages.filter(p=>p.indexable).length,sitemapUrls:urls.length,errors,pages:pages.map(({links,resources,ids,...p})=>p)};
  if(write){fs.mkdirSync('docs',{recursive:true});fs.writeFileSync(origin?'docs/seo-production-validation.json':'docs/seo-validation.json',JSON.stringify(report,null,2)+'\n');}
  const issues=pages.filter(p=>p.errors.length);console.log(JSON.stringify({pages:pages.length,indexable:report.indexable,sitemapUrls:urls.length,errors,issues:issues.map(p=>({path:p.path,errors:p.errors}))},null,2));
  if(errors.length||issues.length)throw Error('SEO_AUDIT_FAILED');return report;
}
if(require.main===module)audit({origin:process.env.SEO_ORIGIN||null}).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={audit,xmlUrls};
