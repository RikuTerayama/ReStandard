'use strict';
const fs=require('node:fs');
// Self-contained transparent SVG assets: the original monochrome artwork is
// embedded byte-for-byte, with white converted to alpha inside the image itself.
// No external CSS filter, Image CDN background, image generation or tracing.
function render(){
 for(const [source,target,width,height] of [
  ['san arcident.webp','sans-arcidet-transparent.svg',1200,628],
  ['hat attack.webp','hat-attack-transparent.svg',225,225]
 ]){
  const data=fs.readFileSync('image/'+source).toString('base64');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><filter id="white" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -0.2126 -0.7152 -0.0722 1 0"/></filter></defs><image width="${width}" height="${height}" filter="url(#white)" xlink:href="data:image/webp;base64,${data}"/></svg>\n`;
  fs.writeFileSync('image/'+target,svg);
 }
 let html=fs.readFileSync('index.html','utf8'),i=0;
 const profiles=JSON.parse(fs.readFileSync('catalog/brand-profiles.json','utf8'));
 html=html.replace(/<figure class="brand-card">[\s\S]*?<\/figure>/g,block=>{
  const p=profiles[i++];if(!p)throw Error('Unexpected home brand card');
  const open=block.match(/<a\b[^>]*>/)?.[0];if(!open)throw Error('Missing brand link');
  return `<figure class="brand-card">${open}<img src="${p.logo}" width="156" height="156" class="brand-logo" loading="lazy" decoding="async" alt="${p.name}"></a></figure>`;
 });
 if(i!==profiles.length)throw Error('Incomplete home brand set');
 fs.writeFileSync('index.html',html);
}
if(require.main===module)render();module.exports={render};
