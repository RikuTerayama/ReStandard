'use strict';
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const origin='https://restandard-2025.netlify.app';
const target='/news/2025fw-new-arrivalharley-of-scotland/';
async function get(route){const r=await fetch(origin+route,{redirect:'manual'});return {route,status:r.status,location:r.headers.get('location'),xRobots:r.headers.get('x-robots-tag'),html:await r.text()};}
(async()=>{
  const rows=[];
  for(const route of ['/about','/about.html','/news','/news.html',target,'/robots.txt','/sitemap.xml','/sitemap-pages.xml']){
    const r=await get(route),d=new JSDOM(r.html,{url:origin+route}).window.document;
    rows.push({route,status:r.status,location:r.location,xRobots:r.xRobots,canonical:d.querySelector('link[rel=canonical]')?.href,robots:d.querySelector('meta[name=robots]')?.content,
      ...(route===target?{title:d.title,h1:d.querySelector('h1')?.textContent,articleChars:d.querySelector('article')?.textContent.replace(/\s+/g,' ').trim().length,schemas:[...d.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent))}:{}),
      ...(route==='/news.html'?{targetLinks:[...d.querySelectorAll('a')].filter(a=>a.pathname===target).length}:{}),
      ...(route==='/sitemap-pages.xml'?{hasTarget:r.html.includes(origin+target),aboutCanonical:r.html.includes(origin+'/about.html'),newsCanonical:r.html.includes(origin+'/news.html'),oldAlias:/<loc>[^<]+\/(?:about|news)<\/loc>/.test(r.html)}:{}),
      ...(route==='/robots.txt'?{body:r.html}:{})});
    d.defaultView.close();
  }
  fs.mkdirSync('.catalog-private',{recursive:true});
  fs.writeFileSync('.catalog-private/search-console-current.json',JSON.stringify({at:new Date().toISOString(),rows},null,2));
  console.log(JSON.stringify(rows.map(({schemas,body,...r})=>r),null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
