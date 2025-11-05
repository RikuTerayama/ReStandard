#!/usr/bin/env node
/**
 * Meta Description チェックスクリプト
 * - 文字数チェック（80-110文字）
 * - 重複チェック
 * - title/h1との重複チェック
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// HTMLファイルを再帰的に検索
function findHtmlFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      // node_modules, .git, assets, templates を除外
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'assets' && file !== 'templates') {
        findHtmlFiles(filePath, fileList);
      }
    } else if (extname(file) === '.html' && !file.includes('bak')) {
      // テンプレートファイルと検証ファイルを除外
      if (!file.includes('template') && !file.includes('google') && !file.includes('debug')) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// Meta descriptionを抽出
function extractMetaDescription(html) {
  const match = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

// Titleを抽出
function extractTitle(html) {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

// H1を抽出
function extractH1(html) {
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  return h1Match ? h1Match[1].trim().replace(/<[^>]+>/g, '') : null;
}

// 文字数をカウント（全角ベース）
function countChars(str) {
  return str.length;
}

// 文字列の類似度をチェック（簡易版）
function similarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1.0;
  const editDistance = levenshtein(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshtein(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

// メイン処理
const htmlFiles = findHtmlFiles(rootDir);
const results = [];
const descriptions = new Map();

htmlFiles.forEach(file => {
  try {
    const html = readFileSync(file, 'utf-8');
    const description = extractMetaDescription(html);
    const title = extractTitle(html);
    const h1 = extractH1(html);
    const relPath = file.replace(rootDir, '').replace(/\\/g, '/');
    
    if (!description) {
      results.push({
        file: relPath,
        status: 'missing',
        description: null,
        length: 0,
        issues: ['descriptionが存在しません']
      });
      return;
    }
    
    const length = countChars(description);
    const issues = [];
    
    // 文字数チェック
    if (length < 80) {
      issues.push(`文字数が少なすぎます（${length}文字、最小80文字推奨）`);
    } else if (length > 110) {
      issues.push(`文字数が多すぎます（${length}文字、最大110文字）`);
    }
    
    // title/h1との重複チェック
    if (title) {
      const titleSim = similarity(description, title);
      if (titleSim > 0.8) {
        issues.push(`titleとの類似度が高すぎます（${Math.round(titleSim * 100)}%）`);
      }
    }
    
    if (h1) {
      const h1Sim = similarity(description, h1);
      if (h1Sim > 0.8) {
        issues.push(`h1との類似度が高すぎます（${Math.round(h1Sim * 100)}%）`);
      }
    }
    
    // 重複チェック
    if (descriptions.has(description)) {
      issues.push(`重複: ${descriptions.get(description)}と同じdescription`);
    } else {
      descriptions.set(description, relPath);
    }
    
    results.push({
      file: relPath,
      status: issues.length > 0 ? 'warning' : 'ok',
      description: description,
      length: length,
      issues: issues
    });
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

// 結果を表示
console.log('=== Meta Description チェック結果 ===\n');
const okCount = results.filter(r => r.status === 'ok').length;
const warningCount = results.filter(r => r.status === 'warning').length;
const missingCount = results.filter(r => r.status === 'missing').length;

console.log(`総ページ数: ${results.length}`);
console.log(`✅ OK: ${okCount}`);
console.log(`⚠️  警告: ${warningCount}`);
console.log(`❌ 不足: ${missingCount}\n`);

if (warningCount > 0 || missingCount > 0) {
  console.log('=== 詳細 ===\n');
  results.forEach(result => {
    if (result.status !== 'ok') {
      console.log(`📄 ${result.file}`);
      if (result.description) {
        console.log(`   Description: ${result.description.substring(0, 60)}...`);
        console.log(`   文字数: ${result.length}`);
      }
      result.issues.forEach(issue => {
        console.log(`   ⚠️  ${issue}`);
      });
      console.log('');
    }
  });
}

// 重複チェックの詳細
const duplicates = [];
const descMap = new Map();
results.forEach(r => {
  if (r.description) {
    if (!descMap.has(r.description)) {
      descMap.set(r.description, []);
    }
    descMap.get(r.description).push(r.file);
  }
});

descMap.forEach((files, desc) => {
  if (files.length > 1) {
    duplicates.push({ description: desc, files: files });
  }
});

if (duplicates.length > 0) {
  console.log('=== 重複しているDescription ===\n');
  duplicates.forEach(dup => {
    console.log(`「${dup.description.substring(0, 50)}...」`);
    dup.files.forEach(f => console.log(`  - ${f}`));
    console.log('');
  });
}

process.exit(warningCount > 0 || missingCount > 0 ? 1 : 0);

