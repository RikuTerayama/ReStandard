'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {header,footer}=require('../catalog/site-shell.cjs');
const files=['index.html','about.html','vision.html','location.html','contact.html','news.html','sitemap.html','404.html','templates/news_base.html',...(fs.existsSync('lookbook.html')?['lookbook.html']:[]),...fs.readdirSync('news',{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>`news/${e.name}/index.html`)];
for(const file of files){
 let html=fs.readFileSync(file,'utf8');
 html=html.replace(/(<html\b[^>]*?)\s+translate="no"/,'$1');
 html=/<header\b/.test(html)?html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/,header):html.replace(/<nav class="navbar rs-nav"[\s\S]*?<\/nav>/,header);
 html=html.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/,footer);
 html=html.replace(/<link[^>]*href="\/css\/site-shell.css[^>]*>\s*/g,'').replace('</head>','<link rel="stylesheet" href="/css/site-shell.css?v=20261019-2">\n</head>');
 html=html.replace(/js\/editorial.js\?v=[^"']+/g,'js/editorial.js?v=20261018-3');
 html=html.replace(/<link[^>]*href="\/css\/cursor.css[^>]*>\s*/g,'').replace('</head>','<link rel="stylesheet" href="/css/cursor.css?v=20261018-1">\n</head>');
 fs.writeFileSync(file,html);
}
console.log(`Shared header/footer applied to ${files.length} files.`);
