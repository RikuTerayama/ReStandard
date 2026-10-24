const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
const {normalize}=require('../catalog/normalize.cjs');
const {createCatalogService}=require('../catalog/server.cjs');
const config=require('../catalog/config.json');
const snapshot=require('../catalog/public-snapshot.json');
const catalog=normalize(snapshot,config);
const handle=createCatalogService({config,preview:true,load:async()=>snapshot});
async function main(){
  const images=[...new Set(catalog.products.flatMap(p=>p.images.map(i=>i.url)))];
  const imageResults={};let offset=0;
  let queue=images;
  if(process.argv.includes('--retry-failed')){
    const previous=JSON.parse(await fs.readFile('docs/catalog-validation.json','utf8'));
    assert.equal(previous.sourceFetchedAt,snapshot.fetchedAt,'Retry must refer to the same source snapshot');
    const failed=new Set(previous.failedImages.map(i=>i.url));
    for(const url of images)if(!failed.has(url))imageResults[url]={ok:true,status:'previously-verified'};
    queue=images.filter(url=>failed.has(url));
  }
  async function worker(){
    while(offset<queue.length){
      const url=queue[offset++];
      try{
        const r=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(20000)});
        imageResults[url]={ok:r.ok&&/^image\//.test(r.headers.get('content-type')||''),status:r.status,type:r.headers.get('content-type')};
      }catch{imageResults[url]={ok:false,status:'unavailable'};}
    }
  }
  await Promise.all(Array.from({length:4},worker));
  const products=[];
  for(const p of catalog.products){
    const raw=snapshot.items.find(x=>String(x.id)===p.id),r=await handle(p.url);
    const graph=[...r.body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
    const product=graph.find(x=>x['@type']==='Product');
    assert.equal(r.status,200);assert.equal(product.name,raw.name);assert.equal(product.url,config.siteUrl+p.url);
    assert.deepEqual(product.image,raw.images.map(i=>i.url));assert(!product.offers,'No unsupported public inventory Offer');
    assert.equal(p.price,raw.price);assert.equal(p.description,raw.detail);assert(r.body.includes(`href="${p.baseUrl}"`));
    assert.equal((r.body.match(/<h1>/g)||[]).length,1);
    const links=[...r.body.matchAll(/href="(\/(?:products|brands|categories)\/[^"#?]*)"/g)].map(m=>m[1]);
    for(const link of new Set(links))assert.equal((await handle(link)).status,200,`${p.id}: broken internal link ${link}`);
    products.push({id:p.id,name:p.name,url:p.url,images:p.images.length,price:p.price,publicAvailability:p.publicAvailability,
      sourceMatches:true,seo:true,internalLinks:true,imageUrlsOk:p.images.every(i=>imageResults[i.url].ok),
      exactStock:'not acquired',missing:p.missing});
  }
  const report={verifiedAt:new Date().toISOString(),sourceFetchedAt:snapshot.fetchedAt,products:products.length,
    imageReferences:catalog.products.reduce((n,p)=>n+p.images.length,0),uniqueImageUrls:images.length,
    failedImages:Object.entries(imageResults).filter(([,v])=>!v.ok).map(([url,result])=>({url,...result})),results:products};
  await fs.mkdir('docs',{recursive:true});await fs.writeFile('docs/catalog-validation.json',JSON.stringify(report,null,2));
  const rows=products.map(p=>{const item=catalog.products.find(x=>x.id===p.id);return `| ${p.name.replaceAll('|','\\|')} | ${p.id} | ${config.siteUrl+p.url} | ${item.baseUrl} | ${p.images} | ${p.price} | title・canonical・OG・Product・パンくず | ${p.imageUrlsOk?'公開情報・画像URL・内部リンク合格':'画像の再確認が必要'}／正確な在庫数は未取得 |`;});
  await fs.writeFile('docs/catalog-all-products.md',`# 公開ストア全${products.length}商品 — 対応表・検証結果\n\n取得日時：${snapshot.fetchedAt}。検証日時：${report.verifiedAt}。価格は確認時点の税込円。非公開商品は含まない。画像はBASEの登録URL・順序と一致し、HTTP読込応答を確認。全画像の目視検査を意味しない。\n\n| 商品名 | BASE商品ID | ReStandard商品URL | BASE購入URL | 画像枚数 | 価格 | SEO設定 | 検証結果 |\n|---|---|---|---|---:|---:|---|---|\n${rows.join('\n')}\n`);
  console.log(JSON.stringify({...report,results:undefined},null,2));
  if(report.failedImages.length)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
