// scripts/build-news-pages.mjs
// manifest.json と restandard_note_split_html/*.html から
// /news/<slug>/index.html を生成します。

import { promises as fs } from 'fs';
import path from 'path';

const BASE_PATH   = process.env.BASE_PATH || ''; // 環境変数から取得、デフォルトは空文字列
const OUT_ROOT    = path.resolve('news'); // 出力ルート
const HTML_DIR    = path.resolve('assets/restandard_note_split_html');
const MANIFEST    = path.resolve('news_src/manifest.json');
const TEMPLATE    = path.resolve('templates/news_base.html');
const SITE_URL    = 'https://restandard-2025.netlify.app'; // サイトの絶対URL

// 画像URLやルート相対URLを補正
function withBase(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (BASE_PATH && url.startsWith('/')) return BASE_PATH + url;
  return url;
}
function normalizeAsset(url) {
  if (!url) return '';
  url = url.split('#')[0].split('?')[0];
  if (/^https?:\/\//i.test(url)) return url;
  
  // /assets/ パスを /assets/images/ に正規化
  if (url.startsWith('/assets/') && !url.startsWith('/assets/images/')) {
    url = url.replace('/assets/', '/assets/images/');
  }
  if (url.startsWith('/assets/')) return url;
  
  // /images/ パスを /assets/images/ に正規化
  if (url.startsWith('/images/')) return '/assets' + url;
  
  // 相対パスを絶対パスに変換
  if (url.startsWith('assets/')) return '/' + url;
  if (url.startsWith('images/')) return '/assets/' + url;
  
  // ファイル名のみの場合は /assets/images/ を付与
  if (!url.startsWith('/') && !url.includes('/')) {
    return '/assets/images/' + url;
  }
  
  if (!url.startsWith('/')) return '/' + url;
  return url;
}
function fixAssetPaths(html) {
  // 画像パス修正ロジックは廃止 - コンテンツ側で正しいsrcをそのまま使用
  // 相対パスのみ絶対パスに変換（安全な正規化のみ）
  return html
    // 相対パスを絶対パスに変換（/で始まらない場合のみ）
    .replace(/(<img\b[^>]*\bsrc\s*=\s*["'])([^"']+)(["'])/gi, (m, a, src, z) => {
      if (src.startsWith('/') || src.startsWith('http')) {
        return m; // 既に絶対パスまたは外部URLの場合はそのまま
      }
      return a + withBase(normalizeAsset(src)) + z;
    })
    // a href（assets配下の静的ファイルっぽい場合のみ補正）
    .replace(/(<a\b[^>]*\bhref\s*=\s*["'])(\/?(?:assets|images)\/[^"']+)(["'])/gi, (m, a, href, z) => a + withBase(normalizeAsset(href)) + z);
}

// 画像パス検証関数
async function validateImagePaths(html, slug) {
  const errors = [];
  
  // HTMLから全てのimg srcを抽出
  const imgSrcMatches = html.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi);
  
  for (const match of imgSrcMatches) {
    const src = match[1];
    
    // 外部URLの場合はスキップ
    if (src.startsWith('http')) {
      continue;
    }
    
    // 絶対パス（/で始まる）でない場合はエラー
    if (!src.startsWith('/')) {
      errors.push(`Relative path detected: ${src} (should be absolute path starting with /)`);
      continue;
    }
    
    // /assets/images/で始まらない場合はエラー
    if (!src.startsWith('/assets/images/')) {
      errors.push(`Invalid image path: ${src} (should start with /assets/images/)`);
      continue;
    }
    
    // ローカルファイルの存在確認
    const filePath = path.join(process.cwd(), src.substring(1)); // /assets/images/... -> assets/images/...
    try {
      await fs.access(filePath);
    } catch (error) {
      errors.push(`Image file not found: ${src} (expected at ${filePath})`);
    }
  }
  
  return errors;
}

function formatHtmlForReadability(html) {
  if (!html) return html;
  
  // HTMLを整形して読みやすくする - より強力なアプローチ
  let formatted = html
    // すべてのタグの間に改行を挿入
    .replace(/></g, '>\n<')
    // 自己終了タグの後に改行を追加
    .replace(/<(br|hr|img|input|meta|link)\b[^>]*\/?>/gi, (match) => match + '\n')
    // 連続する改行を整理
    .replace(/\n{3,}/g, '\n\n');
  
  // インデントを追加
  const lines = formatted.split('\n');
  let indentLevel = 0;
  const indentedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    
    // 閉じタグの場合はインデントレベルを減らしてから出力
    if (trimmed.startsWith('</')) {
      indentLevel = Math.max(0, indentLevel - 1);
      return '  '.repeat(indentLevel) + trimmed;
    }
    
    // 開始タグの場合は出力してからインデントレベルを増やす
    const result = '  '.repeat(indentLevel) + trimmed;
    if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>')) {
      indentLevel++;
    }
    
    return result;
  });
  
  return indentedLines.filter(line => line.length > 0).join('\n');
}

function normalizeArticleHtml(html, pageTitle) {
  if (!html) return html;

  // まずHTMLを整形してから処理
  html = formatHtmlForReadability(html);

  // 画像パス：/assets/ → /assets/images/（画像ファイル名は変更しない）
  html = html.replace(/src="\/assets\/(?!images\/)([^"]+)"/g, 'src="/assets/images/$1"');

  // 本文先頭の重複見出しを削除（最初の <h1> または <h2> が pageTitle と一致/近似）
  try {
    const hMatch = html.match(/<(h1|h2)[^>]*>([\s\S]*?)<\/\1>/i);
    if (hMatch) {
      const inner = hMatch[2].replace(/<[^>]+>/g, '').trim();
      const norm = s => (s || '').replace(/\s+/g, '');
      if (!pageTitle || norm(inner) === norm(pageTitle) || norm(inner).includes(norm(pageTitle))) {
        html = html.replace(hMatch[0], '');
      }
    }
  } catch (_) {}

  // 箇条書き（ul/ol→段落、行頭記号削除）
  html = html
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, body) =>
      body.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, li) => `<p>${li.replace(/^[\s•・\-*]+/, '').trim()}</p>`))
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, body) =>
      body.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, li) => `<p>${li.replace(/^[\s•・\-*]+/, '').trim()}</p>`))
    .replace(/<p>([\s•・\-*]+)([^<]*)<\/p>/gi, (_, __, text) => `<p>${text.trim()}</p>`);

  // お問い合わせ直下のハッシュタグ段落削除
  html = html.replace(/(<p>[^<]*お問い合わせ[^<]*<\/p>)([\s\S]*?)(?=<h\d|$)/i, (m, head, tail) => {
    const cleaned = tail.replace(/<p>[\s#＃]+[^<]*<\/p>/gi, '');
    return head + cleaned;
  });

  return html;
}

function stripLeadingDate(title) {
  if (!title) return title;
  return title.replace(/^\s*\d{1,2}[\/\-]\d{1,2}\s+/, '');
}

function fixContentFormatting(html, title = '') {
  // 箇条書きをプレーンテキスト形式に変更
  // HTMLエンティティをデコード
  // 重複タイトル（Published: を含む行）を削除
  
  // 画像パスを一時的に保護し、alt属性を改善
  const imagePlaceholders = [];
  let protectedHtml = html.replace(/<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (match, before, src, after) => {
    const placeholder = `__IMAGE_PLACEHOLDER_${imagePlaceholders.length}__`;
    imagePlaceholders.push({ src, before, after });
    return match.replace(src, placeholder);
  });
  
  // 通常の処理を実行
  protectedHtml = protectedHtml
    .replace(/&amp;amp;/g, '&amp;')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/Published:\s*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '')
    // 箇条書き記号を削除して改行に（画像パスは保護済み）
    .replace(/・/g, '')
    .replace(/-\s*/g, '')
    .replace(/\*\s*/g, '')
    .replace(/•\s*/g, '')
    .replace(/\d+\.\s*/g, '')
    // 連続する改行を整理
    .replace(/(<br>\s*){3,}/g, '<br><br>');
  
  // 画像パスを復元し、alt属性を改善
  imagePlaceholders.forEach((imgData, index) => {
    const { src, before, after } = imgData;
    protectedHtml = protectedHtml.replace(`__IMAGE_PLACEHOLDER_${index}__`, src);
  });
  
  // 画像のalt属性を改善
  protectedHtml = protectedHtml.replace(/<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (match, before, src, after) => {
    // 既存のalt属性をチェック
    const altMatch = match.match(/alt=["']([^"']*)["']/i);
    const currentAlt = altMatch ? altMatch[1] : '';
    
    // 空のalt属性または数字のみのalt属性を改善
    if (!currentAlt || currentAlt === '' || /^[0-9]+$/.test(currentAlt)) {
      const newAlt = generateImageAlt(src, title, 'product');
      return match.replace(/alt=["'][^"']*["']/i, `alt="${newAlt}"`);
    }
    
    return match;
  });
  
  // ハッシュタグ段落を削除
  protectedHtml = removeHashtagParagraphs(protectedHtml);
  
  // 追加の修正処理
  protectedHtml = applyAdditionalFixes(protectedHtml);
  
  return protectedHtml;
}

function removeHashtagParagraphs(html) {
  if (!html) return html;
  
  // ハッシュタグのみを含む段落を削除
  // パターン1: <p>#ハッシュタグ1 #ハッシュタグ2 ...</p>
  // パターン2: <p>#ハッシュタグ1 #ハッシュタグ2<br>#ハッシュタグ3 #ハッシュタグ4</p>
  // パターン3: 連続するハッシュタグ段落
  
  // まず、ハッシュタグのみを含む段落を特定
  const hashtagParagraphRegex = /<p[^>]*>[\s\S]*?#[^\s<]+[\s\S]*?<\/p>/gi;
  
  // 段落内のテキストを抽出してハッシュタグのみかどうかを判定
  const paragraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  
  let result = html;
  
  paragraphs.forEach(paragraph => {
    // 段落内のテキストを抽出（HTMLタグを除去）
    const textContent = paragraph.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // ハッシュタグのみを含む段落かどうかを判定
    // テキストが#で始まり、空白または#で区切られた文字列のみの場合
    const isHashtagOnly = /^#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s#]+$/.test(textContent) && 
                         textContent.split(/\s+/).every(word => word.startsWith('#') || word === '');
    
    if (isHashtagOnly) {
      // ハッシュタグのみの段落を削除
      result = result.replace(paragraph, '');
    }
  });
  
  // 連続する空行を整理
  result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return result;
}

function applyAdditionalFixes(html) {
  if (!html) return html;
  
  let result = html;
  
  // 1) restandardnetlify.appをrestandard-2025.netlify.appに置換
  result = result.replace(/https:\/\/restandardnetlify\.app\//g, 'https://restandard-2025.netlify.app/');
  
  // 2) タイトルやprev/nextから日付を削除
  // より包括的な日付削除パターン
  result = result.replace(/(\d{1,2}\/\d{1,2})【([^】]+)】/g, '【$2】');
  
  // 日付パターンを複数回適用（重複パターンに対応）
  for (let i = 0; i < 3; i++) {
    result = result.replace(/(\d{1,2}\/\d{1,2})【([^】]+)】/g, '【$2】');
  }
  
  // 3) ※商品リンクの埋め込みを削除
  result = result.replace(/※商品リンクの埋め込み/g, '');
  result = result.replace(/※商品リンク埋め込み/g, '');
  
  // 4) Original linkをカード形式に変換
  result = convertOriginalLinksToCards(result);
  
  // 5) STORESのURLをカード形式に変換
  result = convertStoresUrlsToCards(result);
  
  return result;
}

function convertOriginalLinksToCards(html) {
  if (!html) return html;
  
  // Original linkのパターンを検出してカード形式に変換
  const originalLinkRegex = /Original link:\s*<a[^>]*href="(https:\/\/note\.com\/restandard_2025\/n\/[a-zA-Z0-9]+)"[^>]*>[^<]*<\/a>/g;
  
  return html.replace(originalLinkRegex, (match, url) => {
    return `
<div class="original-link-card" style="
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
">
  <div style="
    display: flex;
    align-items: center;
    gap: 16px;
  ">
    <div style="
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #00c851 0%, #007e33 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 20px;
      flex-shrink: 0;
    ">
      n
    </div>
    <div style="flex: 1;">
      <h3 style="
        margin: 0 0 8px 0;
        color: #333;
        font-size: 18px;
        font-weight: 600;
      ">
        note で元記事を確認
      </h3>
      <p style="
        margin: 0 0 12px 0;
        color: #666;
        font-size: 14px;
        line-height: 1.4;
      ">
        この記事の元となったnoteの記事をご確認いただけます
      </p>
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: #00c851;
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 500;
        text-decoration: none;
        transition: background 0.3s ease;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
        元記事へ
      </div>
    </div>
  </div>
  <div style="
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: transparent;
    z-index: 1;
  " onclick="window.open('${url}', '_blank', 'noopener,noreferrer')"></div>
</div>`;
  });
}

function convertStoresUrlsToCards(html) {
  if (!html) return html;
  
  // STORESのURLパターンを検出してカード形式に変換
  const storesUrlRegex = /<a\s+href="(https:\/\/restandard\.stores\.jp\/items\/[a-zA-Z0-9]+)"[^>]*>([^<]+)<\/a>/g;
  
  return html.replace(storesUrlRegex, (match, url, linkText) => {
    // URLから商品IDを抽出
    const itemId = url.match(/\/items\/([a-zA-Z0-9]+)$/)?.[1];
    if (!itemId) return match;
    
    // カード形式のHTMLを生成
    return `
<div class="stores-card" style="
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
">
  <div style="
    display: flex;
    align-items: center;
    gap: 16px;
  ">
    <div style="
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 20px;
      flex-shrink: 0;
    ">
      S
    </div>
    <div style="flex: 1;">
      <h3 style="
        margin: 0 0 8px 0;
        color: #333;
        font-size: 18px;
        font-weight: 600;
      ">
        STORES で商品を確認
      </h3>
      <p style="
        margin: 0 0 12px 0;
        color: #666;
        font-size: 14px;
        line-height: 1.4;
      ">
        ReStandardのオンラインストアで詳細情報をご確認いただけます
      </p>
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: #667eea;
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 500;
        text-decoration: none;
        transition: background 0.3s ease;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
        商品ページへ
      </div>
    </div>
  </div>
  <div style="
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: transparent;
    z-index: 1;
  " onclick="window.open('${url}', '_blank', 'noopener,noreferrer')"></div>
</div>`;
  });
}

function extractBetween(str, startRe, endRe) {
  const s = str.search(startRe);
  if (s === -1) return '';
  const e = str.slice(s).search(endRe);
  if (e === -1) return '';
  return str.slice(s, s + e).replace(startRe, '');
}
function extractArticleContent(html) {
  // Step1のファイルは <article>...</article> を含む想定。なければ <body> を採用。
  const inner = extractBetween(html, /<article[^>]*>/i, /<\/article>/i);
  if (inner) return inner;
  const body = extractBetween(html, /<body[^>]*>/i, /<\/body>/i);
  return body || html;
}
function extractMeta(html, name) {
  const re = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']\\s*/?>`, 'i');
  const m = html.match(re);
  return m ? m[1].trim() : '';
}
function extractTitle(html) {
  const t = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (t) return t[1].trim();
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return h1 ? h1[1].replace(/<[^>]+>/g, '').trim() : 'Untitled';
}
function extractFirstImg(html) {
  const m = html.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
  return m ? normalizeAsset(m[1]) : '';
}
function fmtDateView(s) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d)) return s;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}
function slugFromFilename(filename) {
  const base = path.basename(filename, '.html');
  const m = base.match(/^\d{3}_(.+)$/);
  return m ? m[1] : base;
}

// SEO関連のヘルパー関数
function generateAbsoluteUrl(relativePath) {
  if (!relativePath) return SITE_URL;
  if (relativePath.startsWith('http')) return relativePath;
  return SITE_URL + (relativePath.startsWith('/') ? relativePath : '/' + relativePath);
}

function extractImageDimensions(imgSrc) {
  // 画像ファイルからサイズを推測（実際のファイルサイズを取得する場合はsharp等を使用）
  // ここでは一般的なサイズを返す
  if (imgSrc.includes('width="620"') && imgSrc.includes('height="620"')) {
    return { width: 620, height: 620 };
  }
  return { width: 800, height: 600 }; // デフォルトサイズ
}

function generateImageAlt(imgSrc, title, context = '') {
  const filename = path.basename(imgSrc, path.extname(imgSrc));
  
  // ファイル名から意味のある部分を抽出
  let cleanFilename = filename.replace(/^[a-z0-9]+_/, '').replace(/[_-]/g, ' ');
  
  // 記事タイトルから主要キーワードを抽出
  const titleKeywords = title.match(/[A-Za-z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g) || [];
  const mainKeywords = titleKeywords.slice(0, 3).join(' ');
  
  // コンテキストに基づいてalt属性を生成
  if (context.includes('product') || context.includes('item')) {
    return `${mainKeywords} 商品画像 - ${cleanFilename}`;
  } else if (context.includes('collection') || context.includes('gallery')) {
    return `${mainKeywords} コレクション画像 - ${cleanFilename}`;
  } else if (context.includes('lookbook') || context.includes('style')) {
    return `${mainKeywords} スタイル画像 - ${cleanFilename}`;
  } else {
    return `${mainKeywords} 画像 - ${cleanFilename}`;
  }
}

function validateHeadingStructure(html) {
  const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
  if (h1Count === 0) {
    throw new Error('H1タグが見つかりません');
  }
  if (h1Count > 1) {
    throw new Error(`H1タグが${h1Count}個見つかりました。1つにしてください`);
  }
  
  // H2の前にH1があることを確認
  const h1Index = html.indexOf('<h1');
  const h2Index = html.indexOf('<h2');
  if (h2Index !== -1 && h2Index < h1Index) {
    throw new Error('H2タグがH1タグより前にあります');
  }
  
  return true;
}

async function readTemplate() {
  return fs.readFile(TEMPLATE, 'utf-8');
}
function applyTemplate(tpl, map) {
  return tpl
    .replaceAll('{{BASE_PATH}}', map.BASE_PATH ?? '')
    .replaceAll('{{TITLE}}', map.TITLE ?? '')
    .replaceAll('{{TITLE_DECODED}}', map.TITLE_DECODED ?? '')
    .replaceAll('{{DESCRIPTION}}', map.DESCRIPTION ?? '')
    .replaceAll('{{CANONICAL}}', map.CANONICAL ?? '')
    .replaceAll('{{CANONICAL_ABS}}', map.CANONICAL_ABS ?? '')
    .replaceAll('{{OG_IMAGE}}', map.OG_IMAGE ?? '')
    .replaceAll('{{OG_IMAGE_ABS}}', map.OG_IMAGE_ABS ?? '')
    .replaceAll('{{OG_IMAGE_W}}', map.OG_IMAGE_W ?? '800')
    .replaceAll('{{OG_IMAGE_H}}', map.OG_IMAGE_H ?? '600')
    .replaceAll('{{OG_IMAGE_ALT}}', map.OG_IMAGE_ALT ?? '')
    .replaceAll('{{KEYWORDS}}', map.KEYWORDS ?? '')
    .replaceAll('{{SECTION}}', map.SECTION ?? '')
    .replaceAll('{{DATE_PUBLISHED}}', map.DATE_PUBLISHED ?? '')
    .replaceAll('{{DATE_MODIFIED}}', map.DATE_MODIFIED ?? '')
    .replaceAll('{{DATE}}', map.DATE ?? '')
    .replaceAll('{{DATE_VIEW}}', map.DATE_VIEW ?? '')
    .replaceAll('{{CONTENT}}', map.CONTENT ?? '')
    .replaceAll('{{RELATED_ARTICLES}}', map.RELATED_ARTICLES ?? '')
    .replaceAll('{{PREV_LINK}}', map.PREV_LINK ?? '')
    .replaceAll('{{NEXT_LINK}}', map.NEXT_LINK ?? '')
    .replaceAll('{{HEADER}}', map.HEADER ?? '')
    .replaceAll('{{FOOTER}}', map.FOOTER ?? '');
}

async function main() {
  // 入力
  const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf-8'));
  const tpl = await readTemplate();

  // 出力ルート準備
  await fs.mkdir(OUT_ROOT, { recursive: true });

  // 前後関係（manifestはStep2で日付降順ソート済み。念のため再ソート）
  manifest.sort((a,b)=> new Date(b.date||0)-new Date(a.date||0));

  for (let i = 0; i < manifest.length; i++) {
    const item = manifest[i];
    const htmlFile = path.join(HTML_DIR, `${String(i+1).padStart(3,'0')}_${item.slug}.html`);
    // ファイル名が連番と合わない場合に備えて、slugで探索フォールバック
    let html;
    try {
      html = await fs.readFile(htmlFile, 'utf-8');
    } catch {
      // slug に合致するファイルを探す
      const entries = await fs.readdir(HTML_DIR);
      const match = entries.find(n => slugFromFilename(n) === item.slug);
      if (!match) {
        console.warn('skip: source html not found for', item.slug);
        continue;
      }
      html = await fs.readFile(path.join(HTML_DIR, match), 'utf-8');
    }

    let title = extractTitle(html) || item.title || 'Untitled';
    let titleDecoded = stripLeadingDate(title.replace(/&amp;amp;/g, '&amp;').replace(/&amp;/g, '&'));
    const date  = item.date || extractMeta(html, 'post_date') || extractMeta(html, 'pubDate') || '';
    const dateView = fmtDateView(date);
    const ogImage = withBase(normalizeAsset(item.firstImage || extractFirstImg(html)));
    const canonical = withBase(`${BASE_PATH}/news/${encodeURIComponent(item.slug)}/`);

    // 本文（article内）を抽出し、画像・リンクのassetsパスを補正
    let content = extractArticleContent(html);
    
    content = normalizeArticleHtml(content, titleDecoded);
    content = fixContentFormatting(content, titleDecoded);
    content = fixAssetPaths(content);
    
    // タイトルとメタタグ、prev/nextリンクも修正
    title = applyAdditionalFixes(title);
    titleDecoded = applyAdditionalFixes(titleDecoded);

    // Prev / Next
    const prev = manifest[i+1];
    const next = manifest[i-1];
    const prevTitle = prev ? applyAdditionalFixes(prev.title) : '';
    const nextTitle = next ? applyAdditionalFixes(next.title) : '';
    const prevLink = prev ? `<a href="${withBase(`${BASE_PATH}/news/${encodeURIComponent(prev.slug)}/`)}" rel="prev" aria-label="${prevTitle}">← ${prevTitle}</a>` : '';
    const nextLink = next ? `<a href="${withBase(`${BASE_PATH}/news/${encodeURIComponent(next.slug)}/`)}" rel="next" aria-label="${nextTitle}">${nextTitle} →</a>` : '';

    // SEO関連のデータを準備
    const canonicalAbs = generateAbsoluteUrl(canonical);
    const ogImageAbs = ogImage ? generateAbsoluteUrl(ogImage) : generateAbsoluteUrl('/assets/ogp-default.jpg');
    const imageDims = extractImageDimensions(ogImage || '');
    const imageAlt = generateImageAlt(ogImage || '', title);
    const keywords = 'ReStandard, ニュース, お知らせ, note, 最新情報, イベント, アパレル卸';
    const section = 'News';
    const datePublished = date || new Date().toISOString();
    const dateModified = date || new Date().toISOString();
    
    // 関連記事生成は削除
    
    // Hタグ構造を検証
    try {
      validateHeadingStructure(content);
    } catch (error) {
      console.warn(`⚠️  Heading structure warning for /news/${item.slug}/: ${error.message}`);
    }

    const filled = applyTemplate(tpl, {
      BASE_PATH: BASE_PATH,
      TITLE: title,
      TITLE_DECODED: titleDecoded,
      DESCRIPTION: (content.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()).slice(0, 120),
      CANONICAL: canonical,
      CANONICAL_ABS: canonicalAbs,
      OG_IMAGE: ogImage || withBase('/assets/ogp-default.jpg'),
      OG_IMAGE_ABS: ogImageAbs,
      OG_IMAGE_W: imageDims.width,
      OG_IMAGE_H: imageDims.height,
      OG_IMAGE_ALT: imageAlt,
      KEYWORDS: keywords,
      SECTION: section,
      DATE_PUBLISHED: datePublished,
      DATE_MODIFIED: dateModified,
      DATE: date || '',
      DATE_VIEW: dateView || '',
      CONTENT: content,
      PREV_LINK: prevLink,
      NEXT_LINK: nextLink,
      HEADER: '', // 既存ヘッダーHTMLをテンプレート側へ直書きしたなら空でOK
      FOOTER: ''  // 同上
    });

    // 画像パス検証フェーズ（一時的に無効化）
    // const imageValidationErrors = await validateImagePaths(content, item.slug);
    // if (imageValidationErrors.length > 0) {
    //   console.error(`❌ Image validation failed for /news/${item.slug}/:`);
    //   imageValidationErrors.forEach(error => console.error(`  - ${error}`));
    //   throw new Error(`Image validation failed for ${item.slug}`);
    // }

    const outDir = path.join(OUT_ROOT, item.slug);
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(path.join(outDir, 'index.html'), filled, 'utf-8');
    console.log('✔ built', `/news/${item.slug}/`);
  }
  
  // sitemap.xmlとrobots.txtを生成
  await generateSitemap(manifest);
  await generateRobotsTxt();
  
  console.log('All done.');
}

// sitemap.xmlを生成
async function generateSitemap(manifest) {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/news/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
${manifest.map(item => {
  const lastmod = item.date ? new Date(item.date).toISOString() : new Date().toISOString();
  return `  <url>
    <loc>${SITE_URL}/news/${item.slug}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
}).join('\n')}
</urlset>`;

  await fs.writeFile('sitemap.xml', sitemap, 'utf-8');
  console.log('✔ generated sitemap.xml');
}

// robots.txtを生成
async function generateRobotsTxt() {
  const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml`;

  await fs.writeFile('robots.txt', robots, 'utf-8');
  console.log('✔ generated robots.txt');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
