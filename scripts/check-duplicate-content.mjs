import fs from 'fs/promises';
import path from 'path';
import { JSDOM } from 'jsdom';

const rootDir = './';
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /assets[\\/]restandard_note_split_html/,
  /templates/,
  /\.bak/,
  /debug/,
  /google/,
  /about\.bak/
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

function extractTextFromHtml(html) {
  // <script>と<style>を除去
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // タグを除去してテキストのみ抽出
  return html.replace(/<[^>]+>/g, '').trim();
}

function extractTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch) return null;
  return extractTextFromHtml(titleMatch[1]);
}

function extractMetaDescription(html) {
  const descMatch = html.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (!descMatch) return null;
  return descMatch[1].trim();
}

function extractH1(html) {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!h1Match) return null;
  return extractTextFromHtml(h1Match[1]);
}

function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  // 簡易的な類似度計算（Levenshtein距離ベース）
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  // 完全一致
  if (str1 === str2) return 1.0;
  
  // 部分一致（一方が他方を含む）
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }
  
  // 文字レベルでの類似度（簡易版）
  let matches = 0;
  const minLen = Math.min(str1.length, str2.length);
  for (let i = 0; i < minLen; i++) {
    if (str1[i] === str2[i]) matches++;
  }
  
  return matches / Math.max(str1.length, str2.length);
}

async function checkDuplicateContent(filePath) {
  const html = await fs.readFile(filePath, 'utf-8');
  const relativePath = path.relative(rootDir, filePath);
  
  return {
    file: relativePath,
    title: extractTitle(html),
    description: extractMetaDescription(html),
    h1: extractH1(html)
  };
}

function findDuplicates(items, field, threshold = 0.9) {
  const duplicates = [];
  const seen = new Map();
  
  for (let i = 0; i < items.length; i++) {
    const item1 = items[i];
    const value1 = item1[field];
    if (!value1) continue;
    
    for (let j = i + 1; j < items.length; j++) {
      const item2 = items[j];
      const value2 = item2[field];
      if (!value2) continue;
      
      const similarity = calculateSimilarity(value1, value2);
      if (similarity >= threshold) {
        duplicates.push({
          file1: item1.file,
          file2: item2.file,
          value1,
          value2,
          similarity: Math.round(similarity * 100)
        });
      }
    }
  }
  
  return duplicates;
}

async function main() {
  const htmlFiles = await findHtmlFiles(rootDir);
  
  console.log('================================================================================');
  console.log('重複コンテンツチェック結果\n');
  console.log(`対象ファイル数: ${htmlFiles.length}\n`);
  
  const allItems = [];
  
  for (const file of htmlFiles) {
    try {
      const item = await checkDuplicateContent(file);
      allItems.push(item);
    } catch (error) {
      console.error(`❌ ${file} の処理中にエラーが発生しました: ${error.message}`);
    }
  }
  
  // タイトルの重複チェック
  const titleDuplicates = findDuplicates(allItems, 'title', 0.85);
  if (titleDuplicates.length > 0) {
    console.log('⚠️  タイトルの重複・類似が検出されました:');
    titleDuplicates.forEach(dup => {
      console.log(`   ${dup.similarity}% 類似: ${dup.file1} ↔ ${dup.file2}`);
      console.log(`      "${dup.value1}" ↔ "${dup.value2}"\n`);
    });
  }
  
  // descriptionの重複チェック
  const descDuplicates = findDuplicates(allItems, 'description', 0.85);
  if (descDuplicates.length > 0) {
    console.log('⚠️  メタ descriptionの重複・類似が検出されました:');
    descDuplicates.forEach(dup => {
      console.log(`   ${dup.similarity}% 類似: ${dup.file1} ↔ ${dup.file2}`);
      console.log(`      "${dup.value1.substring(0, 60)}..." ↔ "${dup.value2.substring(0, 60)}..."\n`);
    });
  }
  
  // h1の重複チェック
  const h1Duplicates = findDuplicates(allItems, 'h1', 0.85);
  if (h1Duplicates.length > 0) {
    console.log('⚠️  h1の重複・類似が検出されました:');
    h1Duplicates.forEach(dup => {
      console.log(`   ${dup.similarity}% 類似: ${dup.file1} ↔ ${dup.file2}`);
      console.log(`      "${dup.value1}" ↔ "${dup.value2}"\n`);
    });
  }
  
  // titleとh1の同一チェック
  console.log('⚠️  titleとh1が同一または酷似しているページ:');
  let titleH1Matches = 0;
  allItems.forEach(item => {
    if (item.title && item.h1) {
      const similarity = calculateSimilarity(item.title, item.h1);
      if (similarity >= 0.9) {
        console.log(`   ${item.file}: ${Math.round(similarity * 100)}% 類似`);
        console.log(`      title: "${item.title}"`);
        console.log(`      h1: "${item.h1}"\n`);
        titleH1Matches++;
      }
    }
  });
  
  if (titleH1Matches === 0) {
    console.log('   （該当なし）\n');
  }
  
  const totalIssues = titleDuplicates.length + descDuplicates.length + h1Duplicates.length + titleH1Matches;
  
  console.log('================================================================================');
  console.log(`\n合計: ${totalIssues}件の重複・類似が検出されました\n`);
  
  if (totalIssues === 0) {
    console.log('✅ 重複コンテンツは検出されませんでした');
  } else {
    console.log('⚠️  重複コンテンツの修正を推奨します');
    console.log('   推奨対応:');
    console.log('   - タイトル・description・h1を各ページでユニークにする');
    console.log('   - 意味が近くても表現を変える');
    console.log('   - canonicalタグで正規URLを指定する');
    process.exit(1);
  }
}

main().catch(console.error);

