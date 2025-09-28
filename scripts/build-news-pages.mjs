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
  // 包括的な画像パス修正マッピング
  const imagePathMappings = {
    // n4b0508af43a4 シリーズ
    'n4b0508af43a4_386ad6ac5ce31e57d2d88555f24117ejpeg': 'n4b0508af43a4_386ad6ac5ce31e57d2d88555f24117e5.jpeg',
    'n4b0508af43a4_17557722323pIAmxytZJK9LwknN8fbDVTO.jpg': 'n4b0508af43a4_1755772232-3pIAmxytZJK9LwknN8fbDVTO.jpg',
    'n4b0508af43a4_17557725085pTUzISyoxZEBaKhufkYrqRd.jpg': 'n4b0508af43a4_1755772508-5pTUzISyoxZEBaKhufkYrqRd.jpg',
    'n4b0508af43a4_1755772392S6CMmXiREfG2nHj8D3YvIspQ.jpg': 'n4b0508af43a4_1755772392-S6CMmXiREfG2nHj8D3YvIspQ.jpg',
    'n4b0508af43a4_1755772491TIbARlHVZodFQCaz5vEq8SYG.jpg': 'n4b0508af43a4_1755772491-TIbARlHVZodFQCaz5vEq8SYG.jpg',
    'n4b0508af43a4_17557725609BaqHMYOcWryhbL3u2A6ZpGD.jpg': 'n4b0508af43a4_1755772560-9BaqHMYOcWryhbL3u2A6ZpGD.jpg',
    
    // n83eb1fd85d36 シリーズ
    'n83eb1fd85d36_17574095761cPISKkZ4HaVob9NLFpzJeupng': 'n83eb1fd85d36_1757409576-1cPISKkZ4HaVob9NLFpzJeu5.png',
    'n83eb1fd85d36_1757409580jG10nKZFHohWxgCsNyEqvJ2i.png': 'n83eb1fd85d36_1757409580-jG10nKZFHohWxgCsNyEqvJ2i.png',
    'n83eb1fd85d36_17574098776cFg8yXD0bUiHE492NBSOt7T.png': 'n83eb1fd85d36_1757409877-6cFg8yXD0bUiHE492NBSOt7T.png',
    'n83eb1fd85d36_17574098833BPNF42zbyErXSL1JolCkGVpng': 'n83eb1fd85d36_1757409883-3BPNF42zbyErXSL1JolCkGV6.png',
    'n83eb1fd85d36_1757409888OSl5QFvLwbWDgxjoCns7Eu3B.png': 'n83eb1fd85d36_1757409888-OSl5QFvLwbWDgxjoCns7Eu3B.png',
    'n83eb1fd85d36_1757410858vrZMIeHwFjyYUbJNft8uCXLG.png': 'n83eb1fd85d36_1757410858-vrZMIeHwFjyYUbJNft8uCXLG.png',
    
    // n693bb13049d4 シリーズ
    'n693bb13049d4_e01c6b8e5f9e6cf6666a3f9d961ajpeg': 'n693bb13049d4_e01c6b8e5f9e6cf6666a3f9d961a4875.jpeg',
    'n693bb13049d4_1750122270OLrUj5tBmYsEqZgVXHz1RuKjpg': 'n693bb13049d4_1750122270-OLrUj5tBmYsEqZgVXHz1RuK4.jpg',
    'n693bb13049d4_1750122294Z2uyneJbo3BPI6KNsCxfc8Ejpg': 'n693bb13049d4_1750122294-Z2uyneJbo3BPI6KNsCxfc8E7.jpg',
    
    // n7d897f839d44 シリーズ
    'n7d897f839d44_85a7370a2da9d10e8093793a341812fd.jpeg': 'n7d897f839d44_85a7370a2da9d10e8093793a341812fd.jpeg',
    'n7d897f839d44_1750153907mGaofFWzCAHL9geybviDEnJjpg': 'n7d897f839d44_1750153907-mGaofFWzCAHL9geybviDEnJ7.jpg',
    'n7d897f839d44_1750153867kVSEx9JqCYXGQvbDhFjP5Ljpg': 'n7d897f839d44_1750153867-kVSEx9JqCYXGQvbDhFjP5L78.jpg',
    
    // nd8379ce69e3c シリーズ
    'nd8379ce69e3c_1749526012qLcTo0H2aKPdEIXjJyRWZGVjpg': 'nd8379ce69e3c_1749526012-qLcTo0H2aKPdEIXjJyRWZGV8.jpg',
    'nd8379ce69e3c_1749526024hQxysMR8oJljSrN3fI6wmzbd.jpg': 'nd8379ce69e3c_1749526024-hQxysMR8oJljSrN3fI6wmzbd.jpg',
    'nd8379ce69e3c_1749526064zFHnKbpQrJIAei49cVo8LwBd.jpg': 'nd8379ce69e3c_1749526064-zFHnKbpQrJIAei49cVo8LwBd.jpg',
    
    // nd1da829361dc シリーズ
    'nd1da829361dc_1749403595EAwap2UnBzLS4fxdqsFPbvgjpg': 'nd1da829361dc_1749403595-EAwap2UnBzLS4fxdqsFPbvg8.jpg',
    'nd1da829361dc_1749403607F1806dk5NOTs9G4AcXIEnwCB.jpg': 'nd1da829361dc_1749403607-F1806dk5NOTs9G4AcXIEnwCB.jpg',
    
    // nb5aee4061d0f シリーズ
    'nb5aee4061d0f_915ca47e159c17e3a9356a35c7b5dcpng': 'nb5aee4061d0f_915ca47e159c17e3a9356a35c7b5dc93.png',
    'nb5aee4061d0f_1749404179DLg0BwjlESXM2T1QHPWfCnNjpg': 'nb5aee4061d0f_1749404179-DLg0BwjlESXM2T1QHPWfCnN8.jpg',
    'nb5aee4061d0f_1749404202cwfoArQueJz3Vg6PtmDlasUjpg': 'nb5aee4061d0f_1749404202-cwfoArQueJz3Vg6PtmDlasU2.jpg',
    'nb5aee4061d0f_17494042158QT1oSrfU5xdseZ0ai2jBPVl.jpg': 'nb5aee4061d0f_1749404215-8QT1oSrfU5xdseZ0ai2jBPVl.jpg',
    
    // n9b4648d4b4d8 シリーズ
    'n9b4648d4b4d8_c703703d9fd60061a53bc187b7dfjpeg': 'n9b4648d4b4d8_c703703d9fd60061a53bc187b7df3136.jpeg',
    'n9b4648d4b4d8_1750168417kqGRAjgQaNyrYMxDJw6und0U.jpg': 'n9b4648d4b4d8_1750168417-kqGRAjgQaNyrYMxDJw6und0U.jpg',
    'n9b4648d4b4d8_1750168402gN42ibfktZmOlxCneo5IE8rv.jpg': 'n9b4648d4b4d8_1750168402-gN42ibfktZmOlxCneo5IE8rv.jpg',
    
    // ncef053b3ea82 シリーズ
    'ncef053b3ea82_92f0117d49b0023cc7dec0798cbe2efjpeg': 'ncef053b3ea82_92f0117d49b0023cc7dec0798cbe2ef1.jpeg',
    'ncef053b3ea82_1750169638YGuwTOsl9c74SfND2ngiPrFK.jpg': 'ncef053b3ea82_1750169638-YGuwTOsl9c74SfND2ngiPrFK.jpg',
    'ncef053b3ea82_1750169650D2lQeaPcYx8HMpW3oAnErdmh.jpg': 'ncef053b3ea82_1750169650-D2lQeaPcYx8HMpW3oAnErdmh.jpg',
    'ncef053b3ea82_17501696642q0ugOvZh3onQ1YVxlKyWfFd.jpg': 'ncef053b3ea82_1750169664-2q0ugOvZh3onQ1YVxlKyWfFd.jpg',
    'ncef053b3ea82_1750169694TOuley2NwjfhmsJb69od18MQ.jpg': 'ncef053b3ea82_1750169694-TOuley2NwjfhmsJb69od18MQ.jpg',
    
    // ncf43100d1e7b シリーズ
    'ncf43100d1e7b_5b72db3ab12160110cadaa2aae250b7ajpeg': 'ncf43100d1e7b_5b72db3ab12160110cadaa2aae250b7a.jpeg',
    
    // nbb0febf53df3 シリーズ
    'nbb0febf53df3_17494045354k7wVq9QbrLIFY0fPe1UnoOJ.jpg': 'nbb0febf53df3_1749404535-4k7wVq9QbrLIFY0fPe1UnoOJ.jpg',
    'nbb0febf53df3_1749404545bSBRkKQeXgtIdJczaT7CW4Z5.jpg': 'nbb0febf53df3_1749404545-bSBRkKQeXgtIdJczaT7CW4Z5.jpg',
    'nbb0febf53df3_1749404556TL6hkmlFGReanfYy1dSuQwHq.jpg': 'nbb0febf53df3_1749404556-TL6hkmlFGReanfYy1dSuQwHq.jpg',
    'nbb0febf53df3_1749404564nQiowgd6szYqREyHGxhLfuI2.jpg': 'nbb0febf53df3_1749404564-nQiowgd6szYqREyHGxhLfuI2.jpg',
    
    // nfcafa06fb104 シリーズ
    'nfcafa06fb104_1757411081uK43Vz1H59XyCh8dDJljcLtx.png': 'nfcafa06fb104_1757411081-uK43Vz1H59XyCh8dDJljcLtx.png',
    'nfcafa06fb104_1757411085OJ5X1ZFxMPs4hdAbQE28DKvpng': 'nfcafa06fb104_1757411085-OJ5X1ZFxMPs4hdAbQE28DKv3.png',
    'nfcafa06fb104_1757411097kDJrpEKLCw6oReH9dm0ublWS.png': 'nfcafa06fb104_1757411097-kDJrpEKLCw6oReH9dm0ublWS.png',
    'nfcafa06fb104_1757411103CPlOIBVwhESctyJZ6qkof21L.png': 'nfcafa06fb104_1757411103-CPlOIBVwhESctyJZ6qkof21L.png'
  };

  // 画像パス修正を適用（単純な文字列置換）
  for (const [wrongPath, correctPath] of Object.entries(imagePathMappings)) {
    html = html.replaceAll(wrongPath, correctPath);
  }

  // src/hrefのうち画像系とリンク系を最低限補正
  return html
    // img src
    .replace(/(<img\b[^>]*\bsrc\s*=\s*["'])([^"']+)(["'])/gi, (m, a, src, z) => a + withBase(normalizeAsset(src)) + z)
    // a href（assets配下の静的ファイルっぽい場合のみ補正）
    .replace(/(<a\b[^>]*\bhref\s*=\s*["'])(\/?(?:assets|images)\/[^"']+)(["'])/gi, (m, a, href, z) => a + withBase(normalizeAsset(href)) + z);
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

  // 画像パス：/assets/ → /assets/images/
  html = html.replace(/src="\/assets\/(?!images\/)/g, 'src="/assets/images/');

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
  return html
    .replace(/&amp;amp;/g, '&amp;')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/Published:\s*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '')
    // 箇条書き記号を削除して改行に
    .replace(/・/g, '')
    .replace(/-\s*/g, '')
    .replace(/\*\s*/g, '')
    .replace(/•\s*/g, '')
    .replace(/\d+\.\s*/g, '')
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
