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

// Lookbook関連削除 - lookbook-interaction.js に完全委譲

// Collection 専用初期化 - Single Source of Truth（Lookbook除外）
document.addEventListener('DOMContentLoaded', function() {
  console.log('[INIT] Collection専用初期化開始');
  
  // Collection marquee初期化のみ（Lookbook除外）
  initMarquee({
    trackSelector: '.collection-scroll-top',
    direction: 'scroll-right-to-left',
    speed: 'var(--collection-speed)',
    pauseOnHover: true
  });
  
  initMarquee({
    trackSelector: '.collection-scroll-bottom',
    direction: 'scroll-left-to-right',
    speed: 'var(--collection-speed)',
    pauseOnHover: true
  });
  
  // Lookbook初期化は lookbook-interaction.js に完全委譲
  console.log('[INIT] Lookbook管理を lookbook-interaction.js に委譲');
});
