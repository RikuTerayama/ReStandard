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
  console.log('Full manifest URL would be:', window.location.origin + MANIFEST_URL);
  
  // Schema guard for article data
  function isValidArticle(article) {
    return article && 
           typeof article.title === 'string' && 
           typeof article.slug === 'string' &&
           typeof article.date === 'string';
  }
  
  // 画像URL解決ユーティリティ
  function resolveUrl(basePath, p) {
    if (!p) return null;
    
    console.log('resolveUrl called with:', { basePath, p });
    
    // 絶対パス（/で始まる）の場合はそのまま使用
    if (p.startsWith('/')) {
      const result = window.location.origin + p;
      console.log('Absolute path resolved to:', result);
      return result;
    }
    
    // 相対パスの場合はbasePathと組み合わせ
    try {
      const result = new URL(p, window.location.origin + basePath).toString();
      console.log('Relative path resolved to:', result);
      return result;
    } catch (e) {
      console.log('URL resolution failed, returning original:', p);
      return p; // 最後の砦
    }
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
    
    // ピンクの記事のカード作成を特別にログ出力
    if (article.slug.includes('pink')) {
      console.log('🎀 CREATING PINK CARD:', {
        slug: article.slug,
        href: href,
        fullHref: fullHref,
        title: article.title
      });
    }
    
    const figure = document.createElement('div');
    figure.className = 'thumb';
    
    if (article.firstImage) {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = decodeEntities(article.title || '');
      
      // 画像URL解決 - シンプルな絶対URL生成
      const imgUrl = article.firstImage.startsWith('/') 
        ? window.location.origin + article.firstImage
        : window.location.origin + '/' + article.firstImage;
      
      console.log('=== IMAGE DEBUG ===');
      console.log('Article slug:', article.slug);
      console.log('Original firstImage:', article.firstImage);
      console.log('Resolved URL:', imgUrl);
      console.log('Current origin:', window.location.origin);
      
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
      
      img.onload = () => {
        const computedStyle = window.getComputedStyle(img);
        const parentStyle = window.getComputedStyle(img.parentElement);
        console.log('✅ Image loaded successfully:', {
          src: img.src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          articleSlug: article.slug,
          // 画像自体のスタイル
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          width: computedStyle.width,
          height: computedStyle.height,
          position: computedStyle.position,
          zIndex: computedStyle.zIndex,
          transform: computedStyle.transform,
          // 親要素のスタイル
          parentDisplay: parentStyle.display,
          parentVisibility: parentStyle.visibility,
          parentOpacity: parentStyle.opacity,
          parentWidth: parentStyle.width,
          parentHeight: parentStyle.height,
          parentOverflow: parentStyle.overflow,
          parentPosition: parentStyle.position
        });
      };
      
      figure.appendChild(img);
      
      // 強制的な表示確保
      setTimeout(() => {
        img.style.display = 'block';
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        
        // 親要素も確認
        figure.style.display = 'flex';
        figure.style.alignItems = 'center';
        figure.style.justifyContent = 'center';
        figure.style.overflow = 'hidden';
        figure.style.width = '100%';
        figure.style.height = '200px';
        
        console.log('🔧 Forced image display applied for:', article.slug);
      }, 100);
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
    console.log('=== RENDERING CARDS ===');
    console.log('Total valid articles:', validArticles.length);
    
    validArticles.forEach((article, index) => {
      try {
        console.log(`\n--- Creating card ${index + 1} ---`);
        console.log('Article data:', {
          slug: article.slug,
          title: article.title,
          firstImage: article.firstImage,
          date: article.date
        });
        
        // ピンクの記事かどうかを特別にログ出力
        if (article.slug.includes('pink')) {
          console.log('🎀 PINK ARTICLE DETECTED:', article.slug);
        }
        
        const card = createArticleCard(article);
        NEWS_GRID.appendChild(card);
        console.log(`✅ Card ${index + 1} created successfully`);
        
        // ピンクの記事のカードが作成されたかチェック
        if (article.slug.includes('pink')) {
          console.log('🎀 PINK CARD ADDED TO DOM:', card.href);
          // ピンクのカードに特別なスタイルを適用してデバッグ
          card.style.border = '3px solid #ff69b4';
          card.style.backgroundColor = '#fff0f5';
          card.style.position = 'relative';
          card.style.zIndex = '9999';
          card.style.display = 'block';
          card.style.visibility = 'visible';
          card.style.opacity = '1';
          card.style.width = '100%';
          card.style.height = '350px';
          card.style.minHeight = '350px';
          console.log('🎀 PINK CARD STYLE APPLIED');
          
          // 即座にDOM要素の詳細情報をログ出力
          const rect = card.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(card);
          console.log('🎀 PINK CARD DOM INFO (IMMEDIATE):', {
            offsetWidth: card.offsetWidth,
            offsetHeight: card.offsetHeight,
            clientWidth: card.clientWidth,
            clientHeight: card.clientHeight,
            rect: {
              width: rect.width,
              height: rect.height,
              top: rect.top,
              left: rect.left
            },
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            position: computedStyle.position,
            zIndex: computedStyle.zIndex
          });
        }
      } catch (cardError) {
        console.error(`❌ Error creating card for article ${index + 1}:`, cardError);
        console.error('Article data:', article);
      }
    });
    
    console.log('=== CARD RENDERING COMPLETE ===');
    
    // NEWS_GRIDの状態を確認
    console.log('NEWS_GRID INFO:', {
      children: NEWS_GRID.children.length,
      innerHTML: NEWS_GRID.innerHTML.length,
      offsetWidth: NEWS_GRID.offsetWidth,
      offsetHeight: NEWS_GRID.offsetHeight,
      clientWidth: NEWS_GRID.clientWidth,
      clientHeight: NEWS_GRID.clientHeight
    });
    
    // ピンクのカードを特別に確認
    const pinkCard = NEWS_GRID.querySelector('a[href*="pink"]');
    if (pinkCard) {
      console.log('🎀 PINK CARD FOUND IN DOM:', pinkCard.href);
      console.log('🎀 PINK CARD PARENT:', pinkCard.parentElement);
    } else {
      console.log('❌ PINK CARD NOT FOUND IN DOM');
    }
    
    console.log('All cards rendered successfully');
    
  } catch (error) {
    console.error('News manifest loading failed:', error);
    renderFallback(error);
  }
});
