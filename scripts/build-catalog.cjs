'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const config=require('../catalog/config.json');
const {normalize}=require('../catalog/normalize.cjs');
const render=require('../catalog/render.cjs');
(async()=>{
  // Local, noindex preview only. Private administrative snapshots are never copied
  // into a web publish directory. Production requires an authenticated live server.
  const snapshot=JSON.parse(await fs.readFile('catalog/public-snapshot.json','utf8'));
  const catalog=normalize(snapshot,config),root=path.resolve('.catalog-preview');
  const options={siteUrl:config.siteUrl,preview:true};
  const pages=new Map([['/products/',render.listPage(catalog,options)],['/brands/',render.directoryPage(catalog,options)],['/categories/',render.directoryPage(catalog,{...options,kind:'categories'})]]);
  for(const p of render.visible(catalog)){
    pages.set(p.url,render.productPage(p,catalog,options));
    if(p.brand)pages.set(render.brandPath(p.brand),render.listPage(catalog,{...options,path:render.brandPath(p.brand),brand:render.brandKey(p.brand)}));
    for(const c of render.categoriesOf(p))pages.set(render.categoryPath(c),render.listPage(catalog,{...options,path:render.categoryPath(c),category:c}));
  }
  for(const [url,html] of pages){
    const target=path.join(root,decodeURIComponent(url),'index.html');
    await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,html);
  }
  for(const file of ['css/catalog.css','js/catalog.js']){
    await fs.mkdir(path.join(root,path.dirname(file)),{recursive:true});await fs.copyFile(file,path.join(root,file));
  }
  await fs.writeFile(path.join(root,'404.html'),render.errorPage(404,config.siteUrl));
  await fs.writeFile(path.join(root,'robots.txt'),'User-agent: *\nDisallow: /\n');
  console.log(`Built ${pages.size} noindex preview pages; production unchanged.`);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
