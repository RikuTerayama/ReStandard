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
  // src/hrefのうち画像系とリンク系を最低限補正
  return html
    // img src
    .replace(/(<img\b[^>]*\bsrc\s*=\s*["'])([^"']+)(["'])/gi, (m, a, src, z) => a + withBase(normalizeAsset(src)) + z)
    // a href（assets配下の静的ファイルっぽい場合のみ補正）
    .replace(/(<a\b[^>]*\bhref\s*=\s*["'])(\/?(?:assets|images)\/[^"']+)(["'])/gi, (m, a, href, z) => a + withBase(normalizeAsset(href)) + z);
}

function fixContentFormatting(html) {
  // 「・」を改行に変更
  // HTMLエンティティをデコード
  return html
    .replace(/&amp;amp;/g, '&amp;')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/・/g, '<br>')
    // 連続する改行を整理
    .replace(/(<br>\s*){3,}/g, '<br><br>');
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
    const titleDecoded = title.replace(/&amp;amp;/g, '&amp;').replace(/&amp;/g, '&');
    const date  = item.date || extractMeta(html, 'post_date') || extractMeta(html, 'pubDate') || '';
    const dateView = fmtDateView(date);
    const ogImage = withBase(normalizeAsset(item.firstImage || extractFirstImg(html)));
    const canonical = withBase(`${BASE_PATH}/news/${encodeURIComponent(item.slug)}/`);

    // 本文（article内）を抽出し、画像・リンクのassetsパスを補正
    let content = extractArticleContent(html);
    content = fixAssetPaths(content);
    content = fixContentFormatting(content);

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
