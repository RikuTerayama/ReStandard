/**
 * SECTIONS INITIALIZATION - Single Source of Truth
 * ================================================
 * 統合済み: flowing-fix.js, 個別のmarquee初期化スクリプトを統合
 * Duplicate removed: 競合を避けるため、ここでのみ管理
 */

// 統合されたmarquee初期化関数 - Single Source of Truth
function initMarquee({trackSelector, direction, speed, pauseOnHover = true}) {
  const elements = document.querySelectorAll(trackSelector);
  
  elements.forEach(element => {
    // アニメーション設定
    element.style.animation = `${direction} ${speed} linear infinite`;
    
    // ホバー停止設定（pointer有デバイスのみ）
    if (pauseOnHover && window.matchMedia('(hover: hover)').matches) {
      element.addEventListener('mouseenter', () => {
        element.style.animationPlayState = 'paused';
      });
      element.addEventListener('mouseleave', () => {
        element.style.animationPlayState = 'running';
      });
    }
    
    // prefers-reduced-motion 対応
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.style.animation = 'none';
    }
  });
}

// Lookbook のドラッグ/スワイプ操作を有効化 - Single Source of Truth
function enableSwipe({containerSelector}) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;
  
  // マウスイベント
  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    container.style.cursor = 'grabbing';
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
    e.preventDefault();
  });
  
  container.addEventListener('mouseleave', () => {
    isDragging = false;
    container.style.cursor = 'grab';
  });
  
  container.addEventListener('mouseup', () => {
    isDragging = false;
    container.style.cursor = 'grab';
  });
  
  container.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 2;
    container.scrollLeft = scrollLeft - walk;
  });
  
  // タッチイベント
  container.addEventListener('touchstart', (e) => {
    isDragging = true;
    startX = e.touches[0].pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });
  
  container.addEventListener('touchend', () => {
    isDragging = false;
  });
  
  container.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - container.offsetLeft;
    const walk = (x - startX) * 2;
    container.scrollLeft = scrollLeft - walk;
  });
  
  // ホイールイベント（横スクロール）
  container.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  });
}

// Collection / Brands セクション初期化 - Single Source of Truth
document.addEventListener('DOMContentLoaded', function() {
  // Collection セクションの表示確認と複製処理
  function ensureCollectionDisplay() {
    const collectionSection = document.getElementById('collection');
    const topRow = document.querySelector('.collection-row-top');
    const bottomRow = document.querySelector('.collection-row-bottom');
    
    if (collectionSection && topRow && bottomRow) {
      console.info("[COLLECTION] Section properly structured");
      
      // 画像複製処理削除 - collection-interaction.jsに統一
    } else {
      console.warn("[COLLECTION] Section structure issue detected");
    }
  }
  
  // 画像複製関数（無限ループ用）
  function duplicateImages(selector) {
    const track = document.querySelector(selector);
    if (!track) return;
    
    const images = track.querySelectorAll('img, a');
    images.forEach(item => {
      const clone = item.cloneNode(true);
      track.appendChild(clone);
    });
  }
  
  ensureCollectionDisplay();
  
  // marquee初期化 - Collection上下・Lookbookを統一関数で制御（CSS keyframes名と一致）
  initMarquee({
    trackSelector: '.collection-scroll-top',
    direction: 'scroll-right-to-left',
    speed: 'var(--track-speed)',
    pauseOnHover: true
  });
  
  initMarquee({
    trackSelector: '.collection-scroll-bottom',
    direction: 'scroll-left-to-right',
    speed: 'var(--track-speed)',
    pauseOnHover: true
  });
  
  initMarquee({
    trackSelector: '.lookbook-track',
    direction: 'lookbook-scroll',
    speed: '40s',
    pauseOnHover: true
  });
  
  // Lookbook のドラッグ/スワイプ操作を有効化
  enableSwipe({
    containerSelector: '.lookbook-container'
  });
});
