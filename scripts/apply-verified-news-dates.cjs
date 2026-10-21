'use strict';
const fs=require('node:fs');
const evidence=require('../docs/news-date-evidence-2026-10-20.json');
const manifest=JSON.parse(fs.readFileSync('news_src/manifest.json','utf8'));
for(const row of evidence.articles){
  if(!row.verified||row.display[0]?.date!==row.verified)throw Error(`Unverified date: ${row.slug}`);
  const item=manifest.find(p=>p.slug===row.slug);
  if(!item||item.original!==row.original)throw Error(`Source mismatch: ${row.slug}`);
  item.date=row.verified;
  const file=`news/${row.slug}/index.html`;
  const html=fs.readFileSync(file,'utf8');
  if(!/<time datetime="[^"]+">[^<]*<\/time>/.test(html))throw Error(`Missing displayed date: ${row.slug}`);
  fs.writeFileSync(file,html.replace(/<time datetime="[^"]+">[^<]*<\/time>/,`<time datetime="${row.verified}">${row.verified.slice(0,10)}</time>`));
}
fs.writeFileSync('news_src/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Applied ${evidence.articles.length} dates verified against original published articles.`);
