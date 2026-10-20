// News manifest loader with fallback UI
document.addEventListener('DOMContentLoaded', async function() {
  const NEWS_ROOT = document.getElementById('news-root');
  const NEWS_GRID = document.getElementById('news-grid');
  const NEWS_LOADING = document.getElementById('news-loading');
  // Build-time cards remain available to crawlers and visitors without JavaScript.
  if (NEWS_GRID?.dataset.prerendered === 'true') return;
  
  if (!NEWS_GRID) {
    console.error('NEWS_GRID element not found!');
    return;
  }
  
  const BASE_PATH = ''; // 例: '/site' で配信する場合は '/site'
  const MANIFEST_URL = BASE_PATH + '/news_src/manifest.json?v=' + Date.now();
  const LINK_PREFIX = BASE_PATH + '/news/'; // /news/<slug>/ に遷移
  
  // Schema guard for article data
  function isValidArticle(article) {
    return article && 
           typeof article.title === 'string' && 
           typeof article.slug === 'string' &&
           typeof article.date === 'string';
  }
  
  function decodeEntities(str) {
    const el = document.createElement('textarea');
    el.innerHTML = str;
    return el.value; // &amp; → &
  }
  
  function cleanTitle(title) {
    if (!title) return '';
    
    // 日付パターンを削除（例：10/28, 10/21, 9/30 など）
    let cleaned = title.replace(/^\d{1,2}\/\d{1,2}\s*/, '');
    
    // エンティティをデコード（&amp; → &）
    cleaned = decodeEntities(cleaned);
    
    return cleaned;
  }

  // Create article card element
  function createArticleCard(article) {
    const card = document.createElement('a');
    card.className = 'news-card';
    const href = LINK_PREFIX + encodeURIComponent(article.slug) + '/';
    // ローカルサーバーでの相対パス解決問題を回避
    const fullHref = href.startsWith('/') ? 
      window.location.origin + href : 
      href;
    card.href = fullHref;
    card.setAttribute('aria-label', article.title);
    
    // デバッグ用ログ（特定の記事の場合）
    if (article.slug === 'harley-of-scotland') {
      console.log('🎯 Harley of Scotland card created:', {
        title: article.title,
        slug: article.slug,
        href: fullHref
      });
    }
    
    if (article.slug === 'restandard2025aw-harley-of-scotland-pink-amp-rockmount-black-stewart') {
      console.log('🎯 9/23 Article card created:', {
        title: article.title,
        slug: article.slug,
        href: fullHref
      });
    }
    
    const figure = document.createElement('div');
    figure.className = 'thumb';
    
    if (article.firstImage) {
      const img = document.createElement('img');
      if (!img.hasAttribute('data-lcp')) { // skip LCP
        img.loading = 'lazy';
      }
      img.decoding = 'async';
      img.alt = decodeEntities(article.title || '');
      
      // 画像URL解決 - シンプルな絶対URL生成
      const imgUrl = article.firstImage.startsWith('/') 
        ? window.location.origin + article.firstImage
        : window.location.origin + '/' + article.firstImage;
      
      img.src = imgUrl;
      
      img.onerror = (e) => { 
        console.error('❌ Image load failed:', {
          originalSrc: img.src,
          error: e,
          articleSlug: article.slug,
          firstImage: article.firstImage
        });
        img.removeAttribute('srcset'); 
        img.src = '/assets/placeholder/cover-fallback.webp'; 
      };
      
      figure.appendChild(img);
    } else {
      figure.innerHTML = '<span style="opacity:.55">No image</span>';
    }
    
    const meta = document.createElement('div');
    meta.className = 'meta';
    
    const time = document.createElement('time');
    const dateIso = formatDate(article.date);
    if (dateIso) {
      time.dateTime = dateIso;
      time.textContent = dateIso;
    }
    
    const h3 = document.createElement('h3');
    h3.textContent = cleanTitle(article.title || '');
    
    meta.appendChild(time);
    meta.appendChild(h3);
    
    card.appendChild(figure);
    card.appendChild(meta);
    return card;
  }
  
  // Format date for display
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  
  // Render fallback UI with retry button
  function renderFallback(error) {
    console.error('Rendering fallback UI due to error:', error);
    NEWS_GRID.innerHTML = `
      <div class="news-empty" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px;">
        <h3>読み込みに失敗しました</h3>
        <p>記事の読み込み中にエラーが発生しました。</p>
        <p style="font-size: 0.8rem; color: #666; margin: 10px 0;">エラー詳細: ${error.message || 'Unknown error'}</p>
        <button onclick="location.reload()" style="
          background: #333; 
          color: white; 
          border: none; 
          padding: 12px 24px; 
          border-radius: 6px; 
          cursor: pointer; 
          margin-top: 16px;
        ">再読み込み</button>
      </div>
    `;
  }
  
  // Main loading logic
  try {
    if (NEWS_LOADING) NEWS_LOADING.remove();
    
    const response = await fetch(MANIFEST_URL, { 
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Schema guard: check if data is array
    if (!Array.isArray(data)) {
      throw new Error('Invalid manifest format: expected array');
    }
    
    // Filter valid articles and sort by date
    const validArticles = data.filter(isValidArticle);
    validArticles.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    
    if (validArticles.length === 0) {
      NEWS_GRID.innerHTML = '<div class="news-empty">記事がありません</div>';
      return;
    }
    
    // Render article cards
    validArticles.forEach((article, index) => {
      try {
        const card = createArticleCard(article);
        NEWS_GRID.appendChild(card);
        
        // ピンクの記事の場合は特別にログ出力
        if (article.slug.includes('pink')) {
          console.log('🎀 PINK CARD RENDERED:', {
            slug: article.slug,
            title: article.title,
            href: card.href,
            parentElement: card.parentElement
          });
        }
      } catch (cardError) {
        console.error(`❌ Error creating card for article ${index + 1}:`, cardError);
        console.error('Article data:', article);
      }
    });
    
  } catch (error) {
    console.error('News manifest loading failed:', error);
    renderFallback(error);
  }
});
