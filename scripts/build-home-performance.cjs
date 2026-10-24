'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom'),{transformSync}=require('esbuild');
const {PurgeCSS}=require('purgecss');
// Preserve the existing cascade, including Bootstrap's reset. Other pages keep
// their own stylesheets. A single cache-versioned CSS response replaces eleven.
const styles=['style.css','vendor/bootstrap-5.3.0.min.css','reveal.css','i18n-visibility.css','lookbook-override.css','product-marquee.css','editorial.css','language.css','home-refinements.css','discovery.css','site-shell.css','cursor.css'];
function fontText(html){
 const d=new JSDOM(html).window.document;
 const scripts=[...d.scripts].map(s=>s.getAttribute('src')).filter(s=>s&&!/^https?:/.test(s)).map(s=>fs.readFileSync(s.split('?')[0].replace(/^\//,''),'utf8'));
 d.querySelectorAll('script,style,noscript').forEach(e=>e.remove());
 const attrs=[...d.querySelectorAll('[alt],[aria-label],[title]')].flatMap(e=>['alt','aria-label','title'].map(a=>e.getAttribute(a)||''));
 // Include dynamic controls and status messages as well as all Latin characters
 // used in the reviewed English dictionary. Recomputed on every site build.
 const english=Object.values(JSON.parse(fs.readFileSync('assets/i18n/en.json','utf8'))).join('').match(/[^\u3000-\u9fff]/gu)?.join('')||'';
 const text=[...new Set([d.body.textContent,...attrs,...scripts,english,Array.from({length:95},(_,i)=>String.fromCharCode(32+i)).join('')].join('').replace(/\s/g,' '))].sort().join('');
 d.defaultView.close();return text;
}
async function render(){
 let html=fs.readFileSync('index.html','utf8');
 const bootstrap=(await new PurgeCSS().purge({content:[{raw:html,extension:'html'},'js/*.js'],css:['css/vendor/bootstrap-5.3.0.min.css'],safelist:['show','collapse','collapsing','active','disabled']}))[0].css;
 const source=styles.map(p=>p.startsWith('vendor/')?bootstrap:fs.readFileSync('css/'+p,'utf8')).join('\n').replace(/@charset\s+"[^"]+";/g,'');
 const css=transformSync(source,{loader:'css',minify:true,legalComments:'inline',target:['chrome100','safari15','firefox100']}).code;
 fs.writeFileSync('css/home-bundle.css',css);
 const version=crypto.createHash('sha256').update(css).digest('hex').slice(0,12);
 html=html.replace(/<noscript>\s*<link[^>]*bootstrap[^>]*>\s*<\/noscript>/g,'');
 html=html.replace(/<link\b[^>]*>/g,tag=>{
  const href=tag.match(/href="([^"]+)"/)?.[1]||'';
  return /(?:^\/?css\/|cdn\.jsdelivr\.net\/npm\/bootstrap)/.test(href)&&/rel="(?:stylesheet|preload)"/.test(tag)?'':tag;
 });
 const text=fontText(html);
 const url='https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap&text='+encodeURIComponent(text);
 html=html.replace(/href="https:\/\/fonts\.googleapis\.com\/css2[^"\n]+"/g,`href="${url.replaceAll('&','&amp;')}"`);
 html=html.replace('</head>',`<link rel="stylesheet" href="/css/home-bundle.css?v=${version}">\n</head>`);
 if(!html.includes('data-menu-first-paint'))html=html.replace('<meta charset="utf-8">','<meta charset="utf-8">\n  <script data-menu-first-paint>document.documentElement.classList.add("rs-menu-ready");</script>');
 fs.writeFileSync('index.html',html);
 console.log(`Home CSS: ${css.length} bytes, ${text.length} font characters, unchanged cascade.`);
 return {version,characters:text,cssBytes:css.length};
}
if(require.main===module)render().catch(e=>{console.error(e);process.exitCode=1});module.exports={render,fontText,styles};
