const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(htmlPath, 'utf8');

// <picture>要素を<img>に置き換える正規表現
// <picture>から</picture>までの全体を、内部の<img>要素のみに置き換える
const picturePattern = /<picture>\s*<source[^>]*>[\s\S]*?<\/source>\s*<source[^>]*>[\s\S]*?<\/source>\s*<img\s+src="([^"]+)"[^>]*srcset="[^"]*"[^>]*sizes="[^"]*"[^>]*width="([^"]+)"[^>]*height="([^"]+)"[^>]*decoding="([^"]+)"[^>]*alt="([^"]*)"[^>]*style="([^"]*)"[^>]*(?:data-lcp="([^"]*)"[^>]*)?(?:fetchpriority="([^"]*)"[^>]*)?>/g;

content = content.replace(picturePattern, (match, src, width, height, decoding, alt, style, dataLcp, fetchpriority) => {
  let imgTag = `<img src="${src}" width="${width}" height="${height}" decoding="${decoding}" alt="${alt}" style="${style}"`;
  if (dataLcp) imgTag += ` data-lcp="${dataLcp}"`;
  if (fetchpriority) imgTag += ` fetchpriority="${fetchpriority}"`;
  imgTag += '>';
  return imgTag;
});

// </picture>タグを削除
content = content.replace(/<\/picture>/g, '');

fs.writeFileSync(htmlPath, content, 'utf8');
console.log('Picture tags removed successfully');


