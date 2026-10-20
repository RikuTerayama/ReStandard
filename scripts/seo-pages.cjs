'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const {siteUrl}=require('../catalog/config.json');
const staticPages=require('../catalog/static-pages.json');
const root=path.resolve(__dirname,'..');
const jsonLD=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
const escape=value=>String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const norm=value=>value.replace(/\s+/g,' ').trim();
const route=file=>file==='index.html'?'/':'/'+file.replace(/\/index\.html$/,'/');
function files(base=root){
  const articles=fs.readdirSync(path.join(base,'news'),{withFileTypes:true}).filter(e=>e.isDirectory()&&fs.existsSync(path.join(base,'news',e.name,'index.html'))).map(e=>`news/${e.name}/index.html`);
  return [...staticPages,...articles.sort()];
}
function organization(document){
  // Use the links actually published in the shared footer, not legacy placeholders.
  const links=[...document.querySelectorAll('[aria-labelledby="footer-follow"] a')].map(a=>a.href);
  return {'@context':'https://schema.org','@type':'Organization','@id':siteUrl+'/#organization',name:'ReStandard',url:siteUrl+'/',...(links.length?{sameAs:links}:{})};
}
function articleSchemas(document,url){
  const headline=norm(document.querySelector('h1')?.textContent||'');
  if(!headline)throw Error(`ARTICLE_H1_REQUIRED: ${url}`);
  const description=document.querySelector('meta[name="description"]')?.content;
  const image=document.querySelector('meta[property="og:image"]')?.content;
  const rawDate=document.querySelector('time[datetime]')?.getAttribute('datetime');
  // Google's Article markup requires a timezone-qualified datetime. Never invent a timezone.
  const date=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(rawDate||'')?rawDate:null;
  return [organization(document),{'@context':'https://schema.org','@type':'Article','@id':url+'#article',headline,description,url,mainEntityOfPage:{'@type':'WebPage','@id':url},...(image?{image:[image]}:{}),...(date?{datePublished:date}:{}),author:{'@type':'Organization','@id':siteUrl+'/#organization',name:'ReStandard',url:siteUrl+'/'},publisher:{'@id':siteUrl+'/#organization'},isPartOf:{'@type':'WebSite','@id':siteUrl+'/#website',name:'ReStandard',url:siteUrl+'/'}}, {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{name:'Home',item:siteUrl+'/'},{name:'News',item:siteUrl+'/news.html'},{name:headline,item:url}].map((v,i)=>({'@type':'ListItem',position:i+1,...v}))}];
}
function repair(html,file){
  html=html.replace(/^\uFEFF/,'');
  const url=siteUrl+route(file),dom=new JSDOM(html,{url}),d=dom.window.document;
  const article=file.startsWith('news/');
  let schemas;
  if(article){schemas=articleSchemas(d,url);}else{
    schemas=[...d.querySelectorAll('script[type="application/ld+json"]')].map(s=>{
      const value=JSON.parse(s.textContent);
      if([].concat(value['@type']).includes('Organization'))return organization(d);
      if(value['@type']==='WebSite'){delete value.potentialAction;value['@id']=siteUrl+'/#website';value.publisher={'@id':siteUrl+'/#organization'};}
      if(value['@type']==='WebPage'){value.name=d.title;value.url=url;}
      return value;
    }).filter(s=>s['@type']!=='BreadcrumbList'||s.itemListElement?.length>=2);
  }
  // Change only metadata; never reserialize the body (which contains carefully styled legacy markup).
  let result=html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi,'');
  result=result.replace(/href="(https:\/\/restandard-2025\.netlify\.app)?\/news\/"/g,(_,origin)=>`href="${origin||''}/news.html"`);
  result=result.replace(/href="https:\/\/restandard-2025\.netlify\.app\/[\uFFFC🧷]+"/gu,`href="${siteUrl}/"`);
  if(article){
    const title=schemas[1].headline+' | ReStandard';
    result=result.replace(/<title>[\s\S]*?<\/title>/i,`<title>${escape(title)}</title>`);
    result=result.replace(/<meta\b[^>]*(?:property|name)=["'](?:og|twitter):(?:title|description)["'][^>]*>/gi,tag=>{
      const key=tag.match(/(?:property|name)=["']([^"']+)/)[1];
      const value=key.endsWith(':title')?schemas[1].headline:schemas[1].description;
      return `<meta ${key.startsWith('og:')?'property':'name'}="${key}" content="${escape(value)}">`;
    });
    // The old template guessed 800x600 for every article. No dimensions are safer than false dimensions.
    result=result.replace(/<meta\b[^>]*property=["']og:image:(?:width|height)["'][^>]*>\s*/gi,'');
  }
  const blocks=schemas.map(s=>`<script type="application/ld+json">${jsonLD(s)}</script>`).join('\n');
  result=result.replace(/<\/head>/i,blocks+'\n</head>');
  dom.window.close();return result;
}
function repairAll(){let count=0;for(const file of files()){const full=path.join(root,file),before=fs.readFileSync(full,'utf8'),after=repair(before,file);if(before!==after){fs.writeFileSync(full,after);count++;}}return count;}
function generateSitemap(base=root){
  const urls=[];
  for(const file of files(base)){
    const dom=new JSDOM(fs.readFileSync(path.join(base,file),'utf8'),{url:siteUrl+route(file)}),d=dom.window.document;
    if(!/noindex/i.test(d.querySelector('meta[name="robots"]')?.content||'')){
      const canonical=d.querySelector('link[rel="canonical"]')?.href;
      if(canonical!==siteUrl+route(file))throw Error(`CANONICAL_MISMATCH: ${file}`);
      urls.push(canonical);
    }
    dom.window.close();
  }
  if(new Set(urls).size!==urls.length)throw Error('DUPLICATE_SITEMAP_URL');
  // Do not derive lastmod from builds, filesystem mtimes or publication dates.
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url=>`  <url><loc>${escape(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
}
if(require.main===module){console.log(`Repaired metadata in ${repairAll()} files.`);fs.writeFileSync(path.join(root,'sitemap.xml'),generateSitemap());}
module.exports={files,route,repair,repairAll,generateSitemap,jsonLD,escape,articleSchemas};
