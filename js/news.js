// News manifest loader with fallback UI
document.addEventListener('DOMContentLoaded', async function() {
  console.log('=== NEWS.JS DEBUG START ===');
  console.log('News.js script started - DOM loaded');
  console.log('Current URL:', window.location.href);
  console.log('Protocol:', window.location.protocol);
  console.log('Host:', window.location.host);
  console.log('Origin:', window.location.origin);
  
  const NEWS_ROOT = document.getElementById('news-root');
  const NEWS_GRID = document.getElementById('news-grid');
  const NEWS_LOADING = document.getElementById('news-loading');
  
  console.log('Elements found:', {
    newsRoot: !!NEWS_ROOT,
    newsGrid: !!NEWS_GRID,
    newsLoading: !!NEWS_LOADING
  });
  
  if (!NEWS_GRID) {
    console.error('NEWS_GRID element not found!');
    return;
  }
  
  const BASE_PATH = ''; // 例: '/site' で配信する場合は '/site'
  const MANIFEST_URL = BASE_PATH + '/news_src/manifest.json';
  const LINK_PREFIX = BASE_PATH + '/news/'; // /news/<slug>/ に遷移
  
  console.log('Fetching manifest from:', MANIFEST_URL);
  console.log('Current location:', window.location.href);
  console.log('BASE_PATH:', BASE_PATH);
  
  // Schema guard for article data
  function isValidArticle(article) {
    return article && 
           typeof article.title === 'string' && 
           typeof article.slug === 'string' &&
           typeof article.date === 'string';
  }
  
  // Normalize image URL with BASE_PATH
  // manifest.jsonのパスをそのまま使用（変更しない）
  function normalizeImageUrl(url) {
    if (!url) {
      console.log('normalizeImageUrl: empty URL provided');
      return '';
    }
    // 外部URLの場合はそのまま返す
    if (/^https?:\/\//i.test(url)) {
      console.log('normalizeImageUrl: external URL, returning as-is:', url);
      return url;
    }
    
    // manifest.jsonのパスをそのまま使用（BASE_PATHは空なので変更なし）
    console.log('normalizeImageUrl: returning original URL:', url);
    return url;
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
    
    console.log('Created card for', article.slug, 'with href:', href);
    console.log('Full URL would be:', fullHref);
    
    const figure = document.createElement('div');
    figure.className = 'thumb';
    
    if (article.firstImage) {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = '';
      
      // 画像パスを直接使用（manifest.jsonのパスをそのまま使用）
      const imageSrc = article.firstImage;
      console.log('=== IMAGE DEBUG START ===');
      console.log('Article slug:', article.slug);
      console.log('Original firstImage:', article.firstImage);
      console.log('Using imageSrc directly:', imageSrc);
      
      img.src = imageSrc;
      
      img.onerror = function() {
        console.error('Image load failed for', article.slug, 'with src:', imageSrc);
        console.log('Trying relative path...');
        // 相対パスで再試行
        const relativeSrc = imageSrc.startsWith('/') ? imageSrc.substring(1) : imageSrc;
        console.log('Trying relative src:', relativeSrc);
        img.src = relativeSrc;
      };
      
      img.onload = function() {
        console.log('Image loaded successfully for', article.slug, 'with src:', img.src);
      };
      
      // 相対パスでも失敗した場合
      img.addEventListener('error', function() {
        console.error('Image load failed with relative path for', article.slug);
        this.style.display = 'none';
        this.parentNode.innerHTML = '<span style="opacity:.55">No image</span>';
      });
      
      figure.appendChild(img);
    } else {
      console.log('No firstImage for article:', article.slug);
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
    h3.textContent = article.title;
    
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
    
    console.log('Fetching manifest from:', MANIFEST_URL);
    console.log('Current location:', window.location.href);
    console.log('BASE_PATH:', BASE_PATH);
    
    const response = await fetch(MANIFEST_URL, { cache: 'no-store' });
    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Manifest loaded:', data.length, 'articles');
    
    // Schema guard: check if data is array
    if (!Array.isArray(data)) {
      throw new Error('Invalid manifest format: expected array');
    }
    
    // Filter valid articles and sort by date
    const validArticles = data.filter(isValidArticle);
    console.log('Valid articles:', validArticles.length);
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
        console.log(`Card ${index + 1} created for:`, article.title);
        console.log(`Article ${index + 1} firstImage:`, article.firstImage);
      } catch (cardError) {
        console.error(`Error creating card for article ${index + 1}:`, cardError, article);
      }
    });
    
    console.log('All cards rendered successfully');
    
  } catch (error) {
    console.error('News manifest loading failed:', error);
    renderFallback(error);
  }
});
