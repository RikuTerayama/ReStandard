'use strict';
const { fetchSnapshot } = require('./base-client.cjs');
const { normalize, isFresh } = require('./normalize.cjs');
const render = require('./render.cjs');
const defaultConfig = require('./config.json');

function createCatalogService({config=defaultConfig,load=()=>config.dataSource==='public-store'?Promise.resolve(require('./public-snapshot.json')):fetchSnapshot({shopUrl:config.shopUrl}),preview=false,now=Date.now,logger=console}={}) {
  let cached=null, pending=null, lastSuccessAt=null;
  async function getCatalog(){
    if(cached && (preview || config.dataSource==='public-store' || isFresh(cached,now())))return cached;
    if(!pending)pending=(async()=>{
      try {
        const snapshot=await load();
        const normalized=normalize(snapshot,config);
        if(!preview&&config.dataSource==='public-store'&&!(snapshot.source==='base-public-store'&&snapshot.publicListingComplete===true))throw new Error('BASE_INCOMPLETE_PUBLIC_SNAPSHOT');
        if(!preview&&config.dataSource!=='public-store'&&!isFresh(normalized,now()))throw new Error('BASE_STALE_SNAPSHOT');
        cached=normalized;lastSuccessAt=cached.fetchedAt;
        return cached;
      } catch(error) {
        cached=null;
        const code=/^BASE_[A-Z0-9_]+$/.test(error.message)?error.message:'CATALOG_UNAVAILABLE';
        logger.error(JSON.stringify({event:'catalog_sync_failed',code,lastSuccessAt}));
        throw error;
      } finally {pending=null;}
    })();
    return pending;
  }
  return async function handle(rawUrl){
    const url=new URL(rawUrl,'https://local.invalid');
    const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
    let pathname;
    try{pathname=decodeURIComponent(url.pathname);}catch{return {status:404,headers,body:render.errorPage(404,config.siteUrl)};}
    const fail=status=>({status,headers:{...headers,'X-Robots-Tag':'noindex',...(status===503?{'Retry-After':'60'}:{})},body:render.errorPage(status,config.siteUrl)});
    if(!/^\/(products|brands|categories)(\/|$)/.test(pathname)&&pathname!=='/catalog-sitemap.xml')return fail(404);
    if(!preview&&(!config.phase1Confirmed||!config.pilotApproved))return fail(503);
    let catalog;
    try{catalog=await getCatalog();}catch{return fail(503);}
    if(!preview&&config.dataSource!=='public-store'&&!isFresh(catalog,now()))return fail(503);
    if(pathname==='/catalog-sitemap.xml')return {status:200,headers:{...headers,'Content-Type':'application/xml; charset=utf-8'},body:render.sitemap(catalog,config.siteUrl)};
    const options={siteUrl:config.siteUrl,preview,now:now(),params:url.searchParams};
    const clean=pathname.replace(/\/+$/,'');
    const parts=url.pathname.replace(/\/+$/,'').split('/').filter(Boolean).map(decodeURIComponent);
    if(parts.length>2)return fail(404);
    let body, canonical;
    if(parts[0]==='products'){
      if(parts.length===1){canonical='/products/';body=render.listPage(catalog,options);}
      else{
        const p=catalog.products.find(p=>p.slug===parts[1]&&p.published);
        if(!p)return fail(404);
        canonical=p.url;body=render.productPage(p,catalog,options);
      }
    }else if(parts.length===1){canonical=`/${parts[0]}/`;body=render.directoryPage(catalog,{...options,kind:parts[0]});}
    else{
      const brands=parts[0]==='brands',name=parts[1];
      if(!render.visible(catalog).some(p=>brands?render.brandKey(p.brand)===render.brandKey(name):render.categoriesOf(p).includes(name)))return fail(404);
      canonical=brands?render.brandPath(name):render.categoryPath(name);
      body=render.listPage(catalog,{...options,path:canonical,brand:brands?name:null,category:brands?null:name});
    }
    if(url.pathname!==canonical)return {status:301,headers:{...headers,Location:canonical+url.search},body:''};
    return {status:200,headers,body};
  };
}
module.exports={createCatalogService};
