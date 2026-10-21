'use strict';
// Sequential, fresh-profile lab runs against the same production URLs.
// Run before and after deployment; never run other browser tests concurrently.
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const phase = process.argv[2];
if (!['before','after'].includes(phase)) throw new Error('Specify before or after');
const dir = path.resolve('.catalog-private/performance-20261020');
fs.mkdirSync(dir, {recursive:true});
const origin = 'https://restandard-2025.netlify.app';
const pages = {home:'/', product:'/products/harley-of-scotland-cardigan-cinder-125801949/'};
const reports=[];
for (const [page,route] of Object.entries(pages)) for(const device of ['mobile','desktop']) for(let run=1;run<=3;run++){
  const file=path.join(dir,`${phase}-${page}-${device}-${run}.json`);
  if(!fs.existsSync(file)){
    const args=['--yes','lighthouse@13.5.0',origin+route,'--chrome-flags=--headless','--only-categories=performance','--output=json',`--output-path=${path.relative(process.cwd(),file)}`,'--quiet',...(device==='desktop'?['--preset=desktop']:[])];
    const result=spawnSync(process.platform==='win32'?'npx.cmd':'npx',args,{shell:process.platform==='win32',stdio:'inherit',timeout:240000});
    if(result.status!==0)throw new Error(`Lighthouse failed: ${page} ${device} ${run}`);
  }
  const r=JSON.parse(fs.readFileSync(file,'utf8'));
  if(r.runtimeError)throw new Error(JSON.stringify(r.runtimeError));
  const row={page,device,run,at:r.fetchTime,url:r.finalDisplayedUrl,version:r.lighthouseVersion,settings:r.configSettings,score:r.categories.performance.score*100,
    lcp:r.audits['largest-contentful-paint'].numericValue,cls:r.audits['cumulative-layout-shift'].numericValue,
    tbt:r.audits['total-blocking-time'].numericValue,bytes:r.audits['total-byte-weight'].numericValue,warnings:r.runWarnings};
  reports.push(row);console.log(JSON.stringify({phase,page,device,run,score:row.score,lcp:Math.round(row.lcp),cls:row.cls,bytes:row.bytes}));
}
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const medians=Object.keys(pages).flatMap(page=>['mobile','desktop'].map(device=>{
  const rows=reports.filter(r=>r.page===page&&r.device===device);
  return {page,device,...Object.fromEntries(['score','lcp','cls','tbt','bytes'].map(k=>[k,median(rows.map(r=>r[k]))]))};
}));
fs.writeFileSync(path.join(dir,`${phase}-summary.json`),JSON.stringify({phase,reports,medians},null,2));
console.log(JSON.stringify(medians,null,2));
