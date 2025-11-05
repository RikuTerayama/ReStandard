import fs from 'fs/promises';
import path from 'path';
import { JSDOM } from 'jsdom';

const rootDir = './';
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /assets\/restandard_note_split_html/,
  /templates/,
  /\.bak/,
  /debug/,
  /google/
];

async function findHtmlFiles(dir, fileList = []) {
  const items = await fs.readdir(dir, { withFileTypes: true });
  
  for (const item of items) {
    const filePath = path.join(dir, item.name);
    const shouldExclude = EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
    
    if (shouldExclude) continue;
    
    if (item.isDirectory()) {
      await findHtmlFiles(filePath, fileList);
    } else if (item.name.endsWith('.html')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

function extractTextContent(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // mainタグ内のテキストを抽出
  const main = document.querySelector('main');
  if (!main) return '';
  
  // script, style, nav, footerを除外
  const toRemove = main.querySelectorAll('script, style, nav, footer');
  toRemove.forEach(el => el.remove());
  
  return main.textContent || '';
}

function countExternalLinks(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const links = document.querySelectorAll('a[href]');
  let externalCount = 0;
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    
    // 外部リンクかチェック
    if (href.startsWith('http://') || href.startsWith('https://')) {
      // 同じドメインかチェック（簡易版）
      if (!href.includes('restandard-2025.netlify.app') && 
          !href.includes('restandard.stores.jp')) {
        externalCount++;
      }
    }
  });
  
  return externalCount;
}

function checkCanonical(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) return { exists: false, href: null };
  
  return { exists: true, href: canonical.getAttribute('href') };
}

function checkHeadSize(html) {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (!headMatch) return { size: 0, lines: 0 };
  
  const headContent = headMatch[1];
  const size = Buffer.byteLength(headContent, 'utf8');
  const lines = headContent.split('\n').length;
  
  return { size, lines };
}

function checkUrlSlug(filePath) {
  const relativePath = path.relative(rootDir, filePath);
  const parts = relativePath.split(path.sep);
  const fileName = parts[parts.length - 1];
  
  // ファイル名から拡張子を除去
  const slug = fileName.replace(/\.html$/, '');
  
  // スラッグのルールチェック（ディレクトリパス全体も含む）
  const issues = [];
  const fullPath = relativePath.replace(/\\/g, '/');
  
  // ディレクトリパス全体でアンダースコアが使われているか
  if (fullPath.includes('_')) {
    issues.push('アンダースコアが使用されています（ハイフン推奨）');
  }
  
  // ファイル名でアンダースコアが使われているか
  if (slug.includes('_')) {
    issues.push('ファイル名にアンダースコアが使用されています（ハイフン推奨）');
  }
  
  // 大文字が含まれているか（ディレクトリパス全体）
  const lowerPath = fullPath.toLowerCase();
  if (fullPath !== lowerPath) {
    issues.push('大文字が含まれています（小文字推奨）');
  }
  
  // スラッグが長すぎるか（50文字以上）
  if (slug.length > 50) {
    issues.push(`スラッグが長すぎます（${slug.length}文字、50文字以内推奨）`);
  }
  
  return { slug, fullPath, issues };
}

async function validateUrlSeo(filePath) {
  const html = await fs.readFile(filePath, 'utf-8');
  const relativePath = path.relative(rootDir, filePath);
  
  const results = {
    file: relativePath,
    errors: [],
    warnings: []
  };
  
  // 1. 本文文字数チェック（最低1000文字）
  const textContent = extractTextContent(html);
  const textLength = textContent.trim().length;
  if (textLength < 1000) {
    results.warnings.push(`本文が短すぎます（${textLength}文字、最低1000文字推奨）`);
  }
  
  // 2. 外部リンク数チェック（100未満）
  const externalLinks = countExternalLinks(html);
  if (externalLinks >= 100) {
    results.warnings.push(`外部リンク数が多すぎます（${externalLinks}件、100未満推奨）`);
  }
  
  // 3. canonicalタグチェック
  const canonical = checkCanonical(html);
  if (!canonical.exists) {
    results.errors.push('canonicalタグが存在しません');
  } else {
    // 自己参照かチェック（簡易版）
    const currentUrl = relativePath.replace(/\\/g, '/');
    const canonicalUrl = canonical.href;
    if (!canonicalUrl.includes(currentUrl.replace(/\.html$/, '')) && 
        !canonicalUrl.includes('index.html')) {
      results.warnings.push(`canonicalタグが自己参照になっていない可能性があります（${canonicalUrl}）`);
    }
  }
  
  // 4. HEADサイズチェック（10KB未満）
  const headSize = checkHeadSize(html);
  if (headSize.size > 10240) {
    results.warnings.push(`HEADが大きすぎます（${Math.round(headSize.size / 1024)}KB、10KB未満推奨）`);
  }
  
  // 5. URL命名チェック
  const urlCheck = checkUrlSlug(filePath);
  if (urlCheck.issues.length > 0) {
    results.warnings.push(...urlCheck.issues.map(issue => `URL命名: ${issue}`));
  }
  
  return results;
}

async function main() {
  const htmlFiles = await findHtmlFiles(rootDir);
  
  console.log('================================================================================');
  console.log('URL/SEO構造チェック結果\n');
  console.log(`対象ファイル数: ${htmlFiles.length}\n`);
  
  const allResults = [];
  let totalErrors = 0;
  let totalWarnings = 0;
  
  for (const file of htmlFiles) {
    try {
      const result = await validateUrlSeo(file);
      allResults.push(result);
      
      if (result.errors.length > 0 || result.warnings.length > 0) {
        console.log(`📄 ${result.file}`);
        result.errors.forEach(err => {
          console.log(`   ❌ ${err}`);
          totalErrors++;
        });
        result.warnings.forEach(warn => {
          console.log(`   ⚠️  ${warn}`);
          totalWarnings++;
        });
        console.log('');
      }
    } catch (error) {
      console.error(`❌ ${file} の処理中にエラーが発生しました: ${error.message}`);
    }
  }
  
  console.log('================================================================================');
  console.log(`\n合計: エラー ${totalErrors}件、警告 ${totalWarnings}件\n`);
  
  if (totalErrors === 0 && totalWarnings === 0) {
    console.log('✅ すべてのチェックを通過しました！');
  } else {
    console.log('⚠️  修正が必要な項目があります');
    process.exit(1);
  }
}

main().catch(console.error);


