'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const config=require('../catalog/config.json');
const {normalize}=require('../catalog/normalize.cjs');
const {connectHome}=require('../catalog/home-links.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.catalog-dist');
(async()=>{
  require('./build-lookbook.cjs');
  require('./sync-site-shell.cjs');
  if(!config.phase1Confirmed||!config.pilotApproved)throw new Error('DESIGN_OR_PILOT_NOT_VALIDATED');
  const snapshot=JSON.parse(await fs.readFile(path.join(root,'catalog/public-snapshot.json'),'utf8'));
  if(snapshot.source!=='base-public-store'||!snapshot.publicListingComplete)throw new Error('PUBLIC_SNAPSHOT_INCOMPLETE');
  const catalog=normalize(snapshot,config);
  const syncStatus=JSON.parse(await fs.readFile(path.join(root,'catalog/public-sync-status.json'),'utf8'));
  if(!syncStatus.ok||syncStatus.lastSuccessAt!==snapshot.fetchedAt)throw new Error('PUBLIC_SYNC_FAILED_OR_UNVERIFIED');
  const report=JSON.parse(await fs.readFile(path.join(root,'docs/catalog-validation.json'),'utf8'));
  if(report.sourceFetchedAt!==snapshot.fetchedAt||report.products!==catalog.products.length||report.failedImages.length)throw new Error('CATALOG_VALIDATION_REQUIRED');
  // Only replace this generated output directory. Never publish the source root.
  if(path.dirname(out)!==root||path.basename(out)!=='.catalog-dist')throw new Error('UNSAFE_OUTPUT_PATH');
  await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
  for(const dir of ['css','js','image','assets','news','public'])await fs.cp(path.join(root,dir),path.join(out,dir),{recursive:true});
  await fs.mkdir(path.join(out,'news_src'),{recursive:true});
  await fs.copyFile(path.join(root,'news_src/manifest.json'),path.join(out,'news_src/manifest.json'));
  for(const file of ['index.html','about.html','contact.html','location.html','vision.html','news.html','sitemap.html','lookbook.html','404.html','robots.txt','google13cb3392ef4a2c51.html','1.mp4','2.mp4','5.mov','7.mp4'])await fs.copyFile(path.join(root,file),path.join(out,file));
  let home=await fs.readFile(path.join(out,'index.html'),'utf8');
  await fs.writeFile(path.join(out,'index.html'),connectHome(home,catalog.products));
  await fs.copyFile(path.join(root,'sitemap.xml'),path.join(out,'sitemap-pages.xml'));
  await fs.writeFile(path.join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${config.siteUrl}/sitemap-pages.xml</loc></sitemap><sitemap><loc>${config.siteUrl}/catalog-sitemap.xml</loc></sitemap></sitemapindex>`);
  // Netlify's standard 404.html fallback supplies a real 404. No SPA catch-all.
  await fs.writeFile(path.join(out,'_redirects'),'# Product routes are handled by catalog.mjs; other missing URLs use 404.html.\n');
  console.log(`Built production files for ${catalog.products.length} public products in .catalog-dist. Nothing deployed.`);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
