const fs=require('node:fs');
const {normalize}=require('../catalog/normalize.cjs');
const config=require('../catalog/config.json');
const snapshot=require('../catalog/public-snapshot.json');
const normalized=normalize(snapshot,config);
const ascii=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
for(const p of normalized.products){
  if(config.slugs[p.id])continue;
  const name=[p.brand,p.itemCode,p.color].map(ascii).filter(Boolean).join('-').slice(0,100).replace(/-$/,'');
  config.slugs[p.id]=`${name||'base-product'}-${p.id}`;
}
fs.writeFileSync('catalog/config.json',JSON.stringify(config,null,2)+'\n');
// Retain a separate representative snapshot for repeatable focused QA.
fs.writeFileSync('catalog/pilot/public-snapshot.json',JSON.stringify({...snapshot,publicListingComplete:false,items:snapshot.items.filter(p=>config.pilotIds.includes(String(p.id)))},null,2)+'\n');
console.log(JSON.stringify({total:normalized.products.length,brands:[...new Set(normalized.products.map(p=>p.brand))],missing:normalized.products.filter(p=>!p.brand).map(p=>p.id),variants:normalized.products.filter(p=>p.variants.length).map(p=>({id:p.id,variants:p.variants}))},null,2));
