// scripts/build-news-manifest.mjs
// 分割済みHTML（restandard_note_split_html/*.html）を走査して
// news_src/manifest.json を生成します。

import { promises as fs } from 'fs';
import path from 'path';

const HTML_DIR = path.resolve('assets/restandard_note_split_html');
const OUT_DIR  = path.resolve('news_src');
const OUT_JSON = path.join(OUT_DIR, 'manifest.json');

// 画像パスを assets 配下に正規化する（例：/assets/... または /assets/images/... を許容）
function normalizeImageUrl(src) {
  if (!src) return '';
  // クエリ/フラグメントは除去（キャッシュバスター対策）
  src = src.split('#')[0].split('?')[0];

  // すでに絶対URLならそのまま
  if (/^https?:\/\//i.test(src)) return src;

  // ルート相対（/assets/...）はそのまま
  if (src.startsWith('/assets/')) return src;

  // /assets/images/... にある前提の相対指定を救う
  if (src.startsWith('assets/')) return '/' + src;
  if (src.startsWith('images/')) return '/assets/' + src;         // images/xxx → /assets/images/xxx でない場合もあるため下で補正
  if (!src.startsWith('/')) src = '/' + src;

  // /images/... だったら /assets/images/... に寄せる
  if (src.startsWith('/images/')) return '/assets' + src;

  // 最後の砦：/assets/ を頭に付ける
  return src.startsWith('/assets/') ? src : '/assets' + src;
}

// 簡易HTML抽出（最初の <img ... src="..."> だけ拾う）
function extractFirstImg(html) {
  const imgRe = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/i;
  const m = html.match(imgRe);
  return m ? normalizeImageUrl(m[1]) : '';
}

function extractMeta(html, name) {
  const re = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']\\s*/?>`, 'i');
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

function extractTitle(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (m) return m[1].trim();
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return h1 ? h1[1].replace(/<[^>]+>/g, '').trim() : 'Untitled';
}

function extractDate(html) {
  // 優先：post_date → 次点：pubDate → 最後：article内<time>
  const postDate = extractMeta(html, 'post_date');
  if (postDate) return postDate;
  const pubDate = extractMeta(html, 'pubDate');
  if (pubDate) return pubDate;
  const t = html.match(/<time[^>]*>([\s\S]*?)<\/time>/i);
  return t ? t[1].trim() : '';
}

// ファイル名 "NNN_slug.html" → slug を取り出す
function slugFromFilename(filename) {
  const base = path.basename(filename, '.html');
  const m = base.match(/^\d{3}_(.+)$/);
  return m ? m[1] : base;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const entries = await fs.readdir(HTML_DIR, { withFileTypes: true });
  const htmlFiles = entries
    .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.html'))
    .map(e => path.join(HTML_DIR, e.name));

  const items = [];
  for (const file of htmlFiles) {
    const html = await fs.readFile(file, 'utf-8');

    const title = extractTitle(html);
    const date  = extractDate(html);
    const img   = extractFirstImg(html);
    const slug  = slugFromFilename(file);

    // 追加メタ（任意）：post_id, original_link
    const postId = extractMeta(html, 'post_id');
    const original = extractMeta(html, 'original_link');

    items.push({
      slug,
      title,
      date,
      firstImage: img,
      postId,
      original
    });
  }

  // 日付降順（無日付は後ろ）
  items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  await fs.writeFile(OUT_JSON, JSON.stringify(items, null, 2), 'utf-8');
  console.log(`✔ Generated ${OUT_JSON} (${items.length} items)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
