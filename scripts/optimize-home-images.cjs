'use strict';
const fs=require('node:fs');
const {responsive}=require('../catalog/responsive-images.cjs');
// Attribute-only editing preserves the reviewed copy, image selection and layout.
function render(){
  let html=fs.readFileSync('index.html','utf8');
  html=html.replace(/<link\b[^>]*rel="preload"[^>]*as="image"[^>]*>/g,'');
  html=html.replace(/(<div class="intro-slides">)([\s\S]*?)(<\/div><div class="intro-theme">)/,(_,start,slides,end)=>start+slides.replace(/<img\b[^>]*>/g,tag=>{
    const src=tag.match(/src="([^"]+)"/)[1].replaceAll('&amp;','&');
    return tag.replace(/\s+(srcset|sizes|onerror)="[^"]*"/g,'').replace('<img ',`<img ${responsive(src,'(max-width: 760px) 360px, 400px',[400,640,800,960])} `);
  })+end);
  fs.writeFileSync('index.html',html);
}
if(require.main===module)render();
module.exports={render};
