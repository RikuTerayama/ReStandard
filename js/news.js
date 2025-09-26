// News manifest loader with fallback UI
document.addEventListener('DOMContentLoaded', async function() {
  console.log('News.js script started - DOM loaded');
  
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
  
  const MANIFEST_URL = 'news_src/manifest.json';
  
  // Schema guard for article data
  function isValidArticle(article) {
    return article && 
           typeof article.title === 'string' && 
           typeof article.slug === 'string' &&
           typeof article.date === 'string';
  }
  
  // Normalize image URL (remove leading slash if present)
  function normalizeImageUrl(url) {
    if (!url) return '';
    return url.startsWith('/') ? url.substring(1) : url;
  }
  
  // Create article card element
  function createArticleCard(article) {
    const card = document.createElement('a');
    card.className = 'news-card';
    card.href = `/news/${encodeURIComponent(article.slug)}/`;
    card.setAttribute('aria-label', article.title);
    
    const figure = document.createElement('div');
    figure.className = 'thumb';
    
    if (article.firstImage) {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = '';
      img.src = normalizeImageUrl(article.firstImage);
      img.onerror = function() {
        this.style.display = 'none';
        this.parentNode.innerHTML = '<span style="opacity:.55">No image</span>';
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
    const response = await fetch(MANIFEST_URL, { cache: 'no-store' });
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
