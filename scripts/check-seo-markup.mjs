import fs from 'fs';
import path from 'path';

const rootDir = './';

// 除外パターン
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /assets/,
  /templates/,
  /\.bak/,
  /bak_/,
  /template/,
  /google/,
  /debug/
];

function findHtmlFiles(dir, fileList = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const filePath = path.join(dir, item.name);
    const shouldExclude = EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
    
    if (item.isDirectory()) {
      if (!shouldExclude) {
        findHtmlFiles(filePath, fileList);
      }
    } else if (item.isFile() && item.name.endsWith('.html')) {
      if (!shouldExclude) {
        fileList.push(filePath);
      }
    }
  }
  
  return fileList;
}

function checkSeoMarkup(filePath) {
  const html = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(rootDir, filePath);
  
  const errors = [];
  const warnings = [];
  
  // 1. h1-h6内に<strong>が存在しないか（見出しタグの直接の子要素のみをチェック）
  // 見出しタグの開始タグと終了タグの間に<strong>が直接含まれている場合のみエラー
  const headingStrongRegex = /<(h[1-6])[^>]*>([^<]*<strong[^>]*>[\s\S]*?<\/strong>[^<]*)*<\/\1>/gi;
  const headingStrongMatches = html.matchAll(headingStrongRegex);
  for (const match of headingStrongMatches) {
    // <strong>が見出しタグの直接の内容として含まれているか確認
    const headingContent = match[0];
    // 見出しタグ直下に<strong>がある場合のみエラー（<p>や<div>などの子要素を除外）
    if (headingContent.match(/<(h[1-6])[^>]*>\s*<strong/i)) {
      errors.push(`❌ 見出しタグ（${match[1]}）内に<strong>タグが含まれています`);
    }
  }
  
  // 2. ページ内<strong>の出現回数 ≤ 2 か
  const strongMatches = html.match(/<strong[^>]*>/gi);
  const strongCount = strongMatches ? strongMatches.length : 0;
  if (strongCount > 2) {
    warnings.push(`⚠️  <strong>タグが${strongCount}個見つかりました。2個以内に制限してください`);
  }
  
  // 3. すべての<img>が width/height/alt を持つか
  const imgRegex = /<img[^>]*>/gi;
  const imgMatches = html.matchAll(imgRegex);
  let imgIndex = 0;
  for (const match of imgMatches) {
    imgIndex++;
    const imgTag = match[0];
    const hasWidth = /width\s*=\s*["'][^"']+["']/i.test(imgTag);
    const hasHeight = /height\s*=\s*["'][^"']+["']/i.test(imgTag);
    const hasAlt = /alt\s*=\s*["'][^"']*["']/i.test(imgTag);
    
    // src属性を抽出して表示
    const srcMatch = imgTag.match(/src\s*=\s*["']([^"']+)["']/i);
    const srcPath = srcMatch ? srcMatch[1] : 'unknown';
    
    if (!hasWidth || !hasHeight) {
      errors.push(`❌ <img>タグ（${imgIndex}個目、src="${srcPath.substring(0, 50)}..."）にwidthまたはheight属性がありません`);
    }
    if (!hasAlt) {
      errors.push(`❌ <img>タグ（${imgIndex}個目、src="${srcPath.substring(0, 50)}..."）にalt属性がありません（装飾画像はalt=""でも可）`);
    }
  }
  
  // 4. <center> や align 属性が残っていないか（data-*属性は除外）
  if (/<center[\s>]/i.test(html)) {
    errors.push(`❌ <center>タグが使用されています。CSSで中央寄せに変更してください`);
  }
  // align属性をチェック（data-alignは除外）
  // data-で始まらないalign属性のみをチェック（単語境界の前にdata-がないもの）
  const alignMatches = html.matchAll(/\b(?!data-)align\s*=\s*["'](center|left|right)["']/gi);
  let hasAlign = false;
  for (const match of alignMatches) {
    // data-alignの場合は除外
    const beforeMatch = html.substring(Math.max(0, match.index - 10), match.index);
    if (!beforeMatch.includes('data-')) {
      hasAlign = true;
      break;
    }
  }
  if (hasAlign) {
    errors.push(`❌ align属性が使用されています。CSSで中央寄せに変更してください`);
  }
  
  // 5. aタグのテキストが「こちら/More/›」のような曖昧語のみでないか
  const linkRegex = /<a[^>]*>([\s\S]*?)<\/a>/gi;
  const linkMatches = html.matchAll(linkRegex);
  const ambiguousWords = ['こちら', 'こちらへ', 'こちらを', 'More', '›', '>>', '詳細', '続きを読む'];
  for (const match of linkMatches) {
    const linkText = (match[1] || '').replace(/<[^>]+>/g, '').trim();
    if (linkText && ambiguousWords.some(word => linkText === word || linkText.match(new RegExp(`^${word}\\s*$`)))) {
      warnings.push(`⚠️  リンクのアンカーテキストが曖昧です: 「${linkText}」`);
    }
  }
  
  // 6. 相対リンクでindex.htmlを直に指す箇所をチェック
  const relativeIndexRegex = /href\s*=\s*["']([^"']*index\.html[^"']*)["']/gi;
  const relativeIndexMatches = html.matchAll(relativeIndexRegex);
  for (const match of relativeIndexMatches) {
    const href = match[1];
    if (!href.startsWith('http') && !href.startsWith('//')) {
      warnings.push(`⚠️  相対リンクでindex.htmlを直指定しています: ${href}`);
    }
  }
  
  // 7. 外部リンクにrel="noopener"があるかチェック
  const externalLinkRegex = /<a[^>]*href\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>/gi;
  const externalLinkMatches = html.matchAll(externalLinkRegex);
  for (const match of externalLinkMatches) {
    const linkTag = match[0];
    if (/target\s*=\s*["']_blank["']/i.test(linkTag) && !/rel\s*=\s*["'][^"']*noopener[^"']*["']/i.test(linkTag)) {
      warnings.push(`⚠️  外部リンク（target="_blank"）にrel="noopener"がありません`);
    }
  }
  
  return {
    path: relativePath,
    errors,
    warnings,
    strongCount
  };
}

// メイン処理
const htmlFiles = findHtmlFiles(rootDir);
const results = htmlFiles.map(checkSeoMarkup);

// 結果を出力
console.log('='.repeat(80));
console.log('SEOマークアップチェック結果\n');
console.log(`対象ファイル数: ${htmlFiles.length}\n`);

let totalErrors = 0;
let totalWarnings = 0;

results.forEach(result => {
  if (result.errors.length > 0 || result.warnings.length > 0) {
    console.log(`\n📄 ${result.path}`);
    console.log(`   <strong>タグ: ${result.strongCount}個`);
    
    if (result.errors.length > 0) {
      result.errors.forEach(err => console.log(`   ${err}`));
      totalErrors += result.errors.length;
    }
    
    if (result.warnings.length > 0) {
      result.warnings.forEach(warn => console.log(`   ${warn}`));
      totalWarnings += result.warnings.length;
    }
  }
});

console.log('\n' + '='.repeat(80));
console.log(`\n合計: エラー ${totalErrors}件、警告 ${totalWarnings}件\n`);

if (totalErrors === 0 && totalWarnings === 0) {
  console.log('✅ すべてのチェックを通過しました！');
  process.exit(0);
} else {
  console.log('⚠️  修正が必要な項目があります');
  process.exit(totalErrors > 0 ? 1 : 0);
}

