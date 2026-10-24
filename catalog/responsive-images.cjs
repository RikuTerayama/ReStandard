'use strict';
// Only resize the same photograph. No crop, stretch, tint or other edits.
const cached = require('../assets/base-products.json').products.flatMap(p=>Object.values(p.photos));
const bySource = new Map(cached.map(p=>[p.source,p]));
const publicSource = file => file.replace(/^image\//,'/image/');
const byFile = new Map(cached.map(p=>[publicSource(p.file),p]));
const escape = value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;');
function sourceFor(source) {
  const local=bySource.get(source);
  return publicSource(local ? local.file : source);
}
function supported(source) {
  return /^\/image\/[\w/.-]+$/.test(source) ||
    /^https:\/\/baseec-img-mng\.akamaized\.net\/images\/item\/origin\/[\w.-]+(?:\?imformat=generic)?$/.test(source);
}
function responsive(source,sizes,widths=[320,480,640,960]) {
  const original=sourceFor(source);
  if(!supported(original))return '';
  const known=byFile.get(original);
  const candidates=[...new Set(widths.map(w=>known?Math.min(w,known.width):w))].sort((a,b)=>a-b);
  const set=candidates.map(w=>`/.netlify/images?url=${encodeURIComponent(original)}&w=${w}&fit=contain&q=85 ${w}w`).join(', ');
  return `srcset="${escape(set)}" sizes="${escape(sizes)}" onerror="this.onerror=null;this.removeAttribute('srcset')"`;
}
module.exports={responsive,sourceFor};
