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

function fixContentFormatting(html) {
  // 箇条書きをプレーンテキスト形式に変更
  // HTMLエンティティをデコード
  // 重複タイトル（Published: を含む行）を削除
  
  // 画像パスを一時的に保護
  const imagePlaceholders = [];
  let protectedHtml = html.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, (match, src) => {
    const placeholder = `__IMAGE_PLACEHOLDER_${imagePlaceholders.length}__`;
    imagePlaceholders.push(src);
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
  
  // 画像パスを復元
  imagePlaceholders.forEach((src, index) => {
    protectedHtml = protectedHtml.replace(`__IMAGE_PLACEHOLDER_${index}__`, src);
  });
  
  // ハッシュタグ段落を削除
  protectedHtml = removeHashtagParagraphs(protectedHtml);
  
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
    .replaceAll('{{OG_IMAGE}}', map.OG_IMAGE ?? '')
    .replaceAll('{{DATE}}', map.DATE ?? '')
    .replaceAll('{{DATE_VIEW}}', map.DATE_VIEW ?? '')
    .replaceAll('{{CONTENT}}', map.CONTENT ?? '')
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

    const title = extractTitle(html) || item.title || 'Untitled';
    const titleDecoded = stripLeadingDate(title.replace(/&amp;amp;/g, '&amp;').replace(/&amp;/g, '&'));
    const date  = item.date || extractMeta(html, 'post_date') || extractMeta(html, 'pubDate') || '';
    const dateView = fmtDateView(date);
    const ogImage = withBase(normalizeAsset(item.firstImage || extractFirstImg(html)));
    const canonical = withBase(`${BASE_PATH}/news/${encodeURIComponent(item.slug)}/`);

    // 本文（article内）を抽出し、画像・リンクのassetsパスを補正
    let content = extractArticleContent(html);
    
    content = normalizeArticleHtml(content, titleDecoded);
    content = fixContentFormatting(content);
    content = fixAssetPaths(content);

    // Prev / Next
    const prev = manifest[i+1];
    const next = manifest[i-1];
    const prevLink = prev ? `<a href="${withBase(`${BASE_PATH}/news/${encodeURIComponent(prev.slug)}/`)}" rel="prev" aria-label="${prev.title}">← ${prev.title}</a>` : '';
    const nextLink = next ? `<a href="${withBase(`${BASE_PATH}/news/${encodeURIComponent(next.slug)}/`)}" rel="next" aria-label="${next.title}">${next.title} →</a>` : '';

    const filled = applyTemplate(tpl, {
      BASE_PATH: BASE_PATH,
      TITLE: title,
      TITLE_DECODED: titleDecoded,
      DESCRIPTION: (content.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()).slice(0, 120),
      CANONICAL: canonical,
      OG_IMAGE: ogImage || withBase('/assets/ogp-default.jpg'),
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
  console.log('All done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
