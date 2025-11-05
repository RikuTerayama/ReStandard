#!/usr/bin/env node
/**
 * 見出し構造チェックスクリプト
 * - h1が1つで、<main>の先頭付近にあること
 * - h2直後にテキストノード（pなど）が存在すること
 * - h1と任意のh2の文字列が完全一致しないこと
 * - h1/h2に<strong>が含まれないこと
 * - 各ページのh1がサイト内ユニークであること
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 除外対象
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /assets/,
  /templates/,
  /template/,
  /google/,
  /debug/,
  /\.bak/
];

function findHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      const shouldExclude = EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
      if (!shouldExclude) {
        findHtmlFiles(filePath, fileList);
      }
    } else if (file.endsWith('.html')) {
      const shouldExclude = EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
      if (!shouldExclude) {
        fileList.push(filePath);
      }
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

function extractH1Content(html) {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!h1Match) return null;
  
  const h1Html = h1Match[1];
  // <strong>などのタグを除去
  const text = extractTextFromHtml(h1Html);
  return text;
}

function extractH2List(html) {
  const h2Matches = html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi);
  const h2List = [];
  
  for (const match of h2Matches) {
    const h2Html = match[1];
    const text = extractTextFromHtml(h2Html);
    h2List.push({
      fullMatch: match[0],
      text: text,
      position: match.index
    });
  }
  
  return h2List;
}

function checkH2HasParagraphAfter(html, h2Position) {
  // h2の直後に<p>タグがあるかチェック
  const afterH2 = html.substring(h2Position);
  // h2の終了タグの直後をチェック
  const afterH2End = afterH2.match(/<\/h2>[\s\n]*([\s\S]{0,500})/i);
  if (!afterH2End) return false;
  
  const nextContent = afterH2End[1];
  // <p>タグが存在するかチェック
  return /<p[^>]*>/i.test(nextContent);
}

function checkMainTagPosition(html) {
  const mainMatch = html.match(/<main[^>]*>/i);
  if (!mainMatch) return { found: false, position: -1 };
  
  return { found: true, position: mainMatch.index };
}

function checkH1InMain(html) {
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (!mainMatch) return { inMain: false, position: -1 };
  
  const mainContent = mainMatch[1];
  const h1InMain = mainContent.match(/<h1[^>]*>/i);
  
  if (!h1InMain) return { inMain: false, position: -1 };
  
  // main内でのh1の位置（main開始からの相対位置）
  const relativePosition = h1InMain.index;
  // main開始からの文字数で、先頭200文字以内かチェック
  const isNearTop = relativePosition < 200;
  
  return { inMain: true, position: relativePosition, isNearTop };
}

function checkStrongInHeading(html, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const matches = html.matchAll(regex);
  
  for (const match of matches) {
    if (/<strong[^>]*>/i.test(match[1])) {
      return true;
    }
  }
  
  return false;
}

function validateHeadings(filePath) {
  const html = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(rootDir, filePath);
  
  const errors = [];
  const warnings = [];
  
  // h1の数をチェック
  const h1Matches = html.match(/<h1[^>]*>/gi);
  const h1Count = h1Matches ? h1Matches.length : 0;
  
  if (h1Count === 0) {
    errors.push('❌ h1タグが見つかりません');
  } else if (h1Count > 1) {
    errors.push(`❌ h1タグが${h1Count}個見つかりました。1つにしてください`);
  } else {
    // h1の内容を取得
    const h1Text = extractH1Content(html);
    if (h1Text) {
      // h1の文字数チェック（20-40文字推奨）
      if (h1Text.length < 10) {
        warnings.push(`⚠️  h1が短すぎます（${h1Text.length}文字）。20-40文字を推奨`);
      } else if (h1Text.length > 50) {
        warnings.push(`⚠️  h1が長すぎます（${h1Text.length}文字）。20-40文字を推奨`);
      }
      
      // h1に<strong>が含まれていないかチェック
      if (checkStrongInHeading(html, 'h1')) {
        errors.push('❌ h1に<strong>タグが含まれています。テキストのみにしてください');
      }
    }
    
    // mainタグ内のh1位置チェック
    const h1InMain = checkH1InMain(html);
    if (!h1InMain.inMain) {
      warnings.push('⚠️  h1が<main>タグ内にありません。main内の先頭付近に配置してください');
    } else if (!h1InMain.isNearTop) {
      warnings.push('⚠️  h1が<main>タグの先頭付近にありません');
    }
    
    // h2がh1より前にないかチェック
    const h1Index = html.indexOf('<h1');
    const h2Index = html.indexOf('<h2');
    if (h2Index !== -1 && h2Index < h1Index) {
      errors.push('❌ h2タグがh1タグより前にあります');
    }
  }
  
  // h2のチェック
  const h2List = extractH2List(html);
  for (const h2 of h2List) {
    // h2に<strong>が含まれていないかチェック
    if (/<strong[^>]*>/i.test(h2.fullMatch)) {
      errors.push(`❌ h2「${h2.text.substring(0, 30)}...」に<strong>タグが含まれています`);
    }
    
    // h2直後に<p>タグがあるかチェック
    if (!checkH2HasParagraphAfter(html, h2.position)) {
      warnings.push(`⚠️  h2「${h2.text.substring(0, 30)}...」の直後に<p>タグがありません`);
    }
    
    // h1とh2の重複チェック
    const h1Text = extractH1Content(html);
    if (h1Text && h1Text === h2.text) {
      errors.push(`❌ h2「${h2.text}」がh1と完全一致しています`);
    }
  }
  
  return {
    path: relativePath,
    h1Count,
    h1Text: extractH1Content(html),
    h2Count: h2List.length,
    errors,
    warnings
  };
}

// メイン処理
const htmlFiles = findHtmlFiles(rootDir);
const results = htmlFiles.map(validateHeadings);

// h1の重複チェック（サイト全体）
const h1Texts = new Map();
results.forEach(result => {
  if (result.h1Text) {
    if (h1Texts.has(result.h1Text)) {
      h1Texts.get(result.h1Text).push(result.path);
    } else {
      h1Texts.set(result.h1Text, [result.path]);
    }
  }
});

// 結果を出力
console.log('='.repeat(80));
console.log('見出し構造チェック結果\n');
console.log(`対象ファイル数: ${htmlFiles.length}\n`);

let totalErrors = 0;
let totalWarnings = 0;

results.forEach(result => {
  if (result.errors.length > 0 || result.warnings.length > 0) {
    console.log(`\n📄 ${result.path}`);
    console.log(`   h1: ${result.h1Count}個 (${result.h1Text || 'なし'})`);
    console.log(`   h2: ${result.h2Count}個`);
    
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

// h1の重複チェック
const duplicateH1s = Array.from(h1Texts.entries()).filter(([text, paths]) => paths.length > 1);
if (duplicateH1s.length > 0) {
  console.log('\n\n❌ サイト内でh1が重複しています:');
  duplicateH1s.forEach(([text, paths]) => {
    console.log(`   「${text}」`);
    paths.forEach(p => console.log(`     - ${p}`));
    totalErrors += paths.length - 1;
  });
}

console.log('\n' + '='.repeat(80));
console.log(`\n合計: エラー ${totalErrors}件、警告 ${totalWarnings}件`);

if (totalErrors === 0 && totalWarnings === 0) {
  console.log('✅ すべてのチェックを通過しました！');
  process.exit(0);
} else {
  console.log('\n⚠️  修正が必要な項目があります');
  process.exit(totalErrors > 0 ? 1 : 0);
}

