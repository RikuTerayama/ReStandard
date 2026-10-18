'use strict';
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createCatalogService}=require('../catalog/server.cjs');
const config=require('../catalog/config.json');
const snapshot=require('../catalog/public-snapshot.json');
const root=path.resolve(__dirname,'..');
const service=createCatalogService({config,preview:true,load:async()=>snapshot});
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(/^\/(products|brands|categories)(\/|$)/.test(url.pathname)||url.pathname==='/catalog-sitemap.xml'){
    const result=await service(req.url);res.writeHead(result.status,result.headers);res.end(result.body);return;
  }
  try{
    // Local preview serves the original file for Netlify Image CDN URLs.
    // Production still uses Netlify's image service and its configured sizes.
    const pathname=decodeURIComponent(url.pathname==='/.netlify/images'&&url.searchParams.get('url')?.startsWith('/image/')?url.searchParams.get('url'):url.pathname);
    if(!/^\/(css|js|image|assets|news)\//.test(pathname)&&!['/','/index.html','/about.html','/vision.html','/news.html','/location.html','/contact.html','/sitemap.html','/lookbook.html','/404.html','/news_src/manifest.json'].includes(pathname))throw new Error('NOT_PUBLIC');
    const file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
    if(!file.startsWith(root+path.sep))throw new Error('INVALID_PATH');
    let data=await fs.readFile(file);
    if(file.endsWith('index.html')){
      // Preview wiring only; production index is not modified before approval.
      const {normalize}=require('../catalog/normalize.cjs');
      data=require('../catalog/home-links.cjs').connectHome(data.toString(),normalize(snapshot,config).products);
    }
    res.writeHead(200,{'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream'});res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`Catalog preview: http://127.0.0.1:${server.address().port}/products/`));
