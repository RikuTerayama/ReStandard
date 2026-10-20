'use strict';
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const {escape}=require('./seo-pages.cjs');
function render(){
  const html=fs.readFileSync('news.html','utf8'),dom=new JSDOM(html,{includeNodeLocations:true}),d=dom.window.document;
  const grid=d.querySelector('#news-grid'),loc=dom.nodeLocation(grid);
  const decode=s=>{const e=d.createElement('textarea');e.innerHTML=s;return e.value;};
  const articles=require('../news_src/manifest.json').filter(a=>a&&typeof a.title==='string'&&typeof a.slug==='string'&&typeof a.date==='string').sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  const cards=articles.map(a=>{
    if(!fs.existsSync(`news/${a.slug}/index.html`))throw Error(`UNPUBLISHED_NEWS_LINK: ${a.slug}`);
    const date=a.date.slice(0,10),title=decode(a.title.replace(/^\d{1,2}\/\d{1,2}\s*/,''));
    return `<a class="news-card" href="/news/${encodeURIComponent(a.slug)}/" aria-label="${escape(a.title)}"><div class="thumb">${a.firstImage?`<img loading="lazy" decoding="async" alt="${escape(decode(a.title))}" src="${escape(a.firstImage.startsWith('/')?a.firstImage:'/'+a.firstImage)}">`:'<span style="opacity:.55">No image</span>'}</div><div class="meta"><time datetime="${escape(date)}">${escape(date)}</time><h3>${escape(title)}</h3></div></a>`;
  }).join('\n');
  let result=html.slice(0,loc.startTag.endOffset)+cards+html.slice(loc.endTag.startOffset);
  result=result.replace(/(<div\b[^>]*id="news-grid"[^>]*)(>)/,(_,tag,end)=>tag.replace(/ data-prerendered="true"/g,'')+' data-prerendered="true"'+end);
  result=result.replace(/<noscript>\s*<p>JavaScript を有効にすると News 一覧を表示できます。<\/p>\s*<\/noscript>/,'');
  result=result.replace(/src="js\/news.js[^"\s]*"/,'src="js/news.js?v=20261020-seo"');
  fs.writeFileSync('news.html',result);dom.window.close();
}
if(require.main===module)render();module.exports={render};
