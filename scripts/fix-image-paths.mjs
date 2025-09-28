// scripts/fix-image-paths.mjs
// 全ソースファイルの画像パスを正しい形式に修正

import { promises as fs } from 'fs';
import path from 'path';

const HTML_DIR = path.resolve('assets/restandard_note_split_html');

// 画像パス修正マッピング
const imagePathMappings = {
  // n80e1f060f0ec シリーズ
  'n80e1f060f0ec_9b2a9ae99074c09f1d31ee60b6ada5apng': 'n80e1f060f0ec_9b2a9ae99074c09f1d31ee60b6ada5a6.png',
  'n80e1f060f0ec_1757416568qOy9gH0RSBMojLfF4Jtb3zpng': 'n80e1f060f0ec_1757416568-qOy9gH0RSBMojLfF4Jtb3z51.png',
  'n80e1f060f0ec_1757416580KTma2ZUAnQRyNsXChPDB5zol.png': 'n80e1f060f0ec_1757416580-KTma2ZUAnQRyNsXChPDB5zol.png',
  'n80e1f060f0ec_1757416590yJir7CDoFjaeGLW936MxEsBpng': 'n80e1f060f0ec_1757416590-yJir7CDoFjaeGLW936MxEsB5.png',
  'n80e1f060f0ec_1757416573MCZ2BgdGT1ouz4xnYDAre6lf.png': 'n80e1f060f0ec_1757416573-MCZ2BgdGT1ouz4xnYDAre6lf.png',
  'n80e1f060f0ec_1757416597AV17WgzrZPO6y8xGiBDluHtI.png': 'n80e1f060f0ec_1757416597-AV17WgzrZPO6y8xGiBDluHtI.png',
  'n80e1f060f0ec_1757416605E29WkZwjLfX50YPcoNty34zS.png': 'n80e1f060f0ec_1757416605-E29WkZwjLfX50YPcoNty34zS.png',
  
  // 他のシリーズも追加可能
  // 'n4b0508af43a4_386ad6ac5ce31e57d2d88555f24117ejpeg': 'n4b0508af43a4_386ad6ac5ce31e57d2d88555f24117e5.jpeg',
  // 'nd556f40035fc_5f616593ffa0572159b0f13ea3488c0fjpeg': 'nd556f40035fc_5f616593ffa0572159b0f13ea3488c0f.jpeg',
};

function fixImagePaths(html) {
  let fixedHtml = html;
  
  // 画像パス修正
  for (const [oldPath, newPath] of Object.entries(imagePathMappings)) {
    const oldSrc = `/assets/images/${oldPath}`;
    const newSrc = `/assets/images/${newPath}`;
    
    // img src属性の修正
    fixedHtml = fixedHtml.replace(
      new RegExp(`(<img[^>]*\\bsrc\\s*=\\s*["'])${oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(["'])`, 'gi'),
      `$1${newSrc}$2`
    );
  }
  
  return fixedHtml;
}

async function main() {
  console.log('🔧 画像パス修正開始...');
  
  try {
    const files = await fs.readdir(HTML_DIR);
    const htmlFiles = files.filter(file => file.endsWith('.html'));
    
    let fixedCount = 0;
    
    for (const file of htmlFiles) {
      const filePath = path.join(HTML_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const fixedContent = fixImagePaths(content);
      
      if (content !== fixedContent) {
        await fs.writeFile(filePath, fixedContent, 'utf-8');
        console.log(`✔ 修正完了: ${file}`);
        fixedCount++;
      } else {
        console.log(`- 変更なし: ${file}`);
      }
    }
    
    console.log(`\n🎉 画像パス修正完了: ${fixedCount}ファイル修正`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

main();
