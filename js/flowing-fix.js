/* ========================================
   Flowing Images Height Fix
   ======================================== */

// flowing imagesの高さ確保とリンク機能保証
function ensureFlowingHeight() {
  const sec = document.getElementById('flowing-images');
  if (!sec) return;
  
  const kids = Array.from(sec.children);
  let maxHeight = 0;
  
  kids.forEach(kid => {
    if (kid.offsetHeight > maxHeight) {
      maxHeight = kid.offsetHeight;
    }
  });
  
  if (maxHeight > 0) {
    sec.style.minHeight = maxHeight + 'px';
  }
}

// リンクのクリック機能を保証
function ensureLinkFunctionality() {
  const links = document.querySelectorAll('#flowing-images .flow-track a, .section-flowing .flow-track a');
  
  links.forEach(link => {
    // リンクのクリック可能性を保証
    link.style.pointerEvents = 'auto';
    link.style.cursor = 'pointer';
    
    // 画像のクリック可能性も保証
    const img = link.querySelector('img');
    if (img) {
      img.style.pointerEvents = 'auto';
      img.style.cursor = 'pointer';
    }
    
    // クリックイベントリスナーを追加（保険）
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const href = this.getAttribute('href');
      if (href) {
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    });
  });
}

// ブランドカードのホバー効果を保証
function ensureBrandHoverEffect() {
  const brandCards = document.querySelectorAll('#brands .brand-card, .section-brands .brand-card');
  
  brandCards.forEach(card => {
    const logo = card.querySelector('.brand-logo');
    const hover = card.querySelector('.brand-hover');
    
    if (logo && hover) {
      // マウスオーバー時の効果
      card.addEventListener('mouseenter', function() {
        if (logo) logo.style.opacity = '0';
        if (hover) hover.style.opacity = '1';
      });
      
      // マウスアウト時の効果
      card.addEventListener('mouseleave', function() {
        if (logo) logo.style.opacity = '1';
        if (hover) hover.style.opacity = '0';
      });
    }
  });
}

// Lookbook機能の保証
function ensureLookbookFunctionality() {
  const lookbookTrack = document.querySelector('#lookbook .lookbook-track, .section-lookbook .lookbook-track');
  const lookbookContainer = document.querySelector('#lookbook .lookbook-container, .section-lookbook .lookbook-container');
  
  // PC用のLookbook自動スクロール
  if (lookbookTrack) {
    // アニメーションが正しく動作するように保証
    lookbookTrack.style.animation = 'lookbook-scroll 25s linear infinite';
    
    // 画像が画面全体で表示されるように初期位置を調整
    lookbookTrack.style.transform = 'translateX(0)';
    
    // 左から右へのスクロールを可能にする
    lookbookTrack.style.minWidth = '100%';
    lookbookTrack.style.justifyContent = 'flex-start';
    
    // スクロール挙動を改善
    lookbookTrack.style.position = 'relative';
    lookbookTrack.style.willChange = 'transform';
    lookbookTrack.style.userSelect = 'none';
    lookbookTrack.style.webkitUserSelect = 'none';
    
    // ホバー時に一時停止機能を保証
    const container = lookbookTrack.closest('.lookbook-container');
    if (container) {
      container.addEventListener('mouseenter', function() {
        lookbookTrack.style.animationPlayState = 'paused';
      });
      
      container.addEventListener('mouseleave', function() {
        lookbookTrack.style.animationPlayState = 'running';
      });
    }
  }
  
  // スマホ用のLookbookスワイプ機能とスクロール機能
  if (lookbookContainer) {
    // 自動スクロールアニメーションを無効化（背景が流れるのを防ぐ）
    lookbookContainer.style.animation = 'none';
    
    // 初期表示時に2セット目の最後の画像に続く形で1セット目の最初の画像が表示されるように位置調整
    setTimeout(() => {
      const containerWidth = lookbookContainer.clientWidth;
      const scrollWidth = lookbookContainer.scrollWidth;
      const maxScrollLeft = scrollWidth - containerWidth;
      
      if (maxScrollLeft > 0) {
        // 2セット目の最後の画像が中央に来るように配置
        const targetScrollLeft = maxScrollLeft * 0.75; // 75%の位置に配置
        lookbookContainer.scrollLeft = targetScrollLeft;
      }
    }, 100);
    
    // 左から右へのスクロールを可能にする
    lookbookContainer.style.minWidth = '100%';
    lookbookContainer.style.justifyContent = 'flex-start';
    
    // スクロール挙動を改善
    lookbookContainer.style.position = 'relative';
    lookbookContainer.style.willChange = 'scroll-position';
    lookbookContainer.style.userSelect = 'none';
    lookbookContainer.style.webkitUserSelect = 'none';
    
    // スワイプ機能の実装
    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;
    
    // タッチイベント（スマートフォン用）
    lookbookContainer.addEventListener('touchstart', function(e) {
      isDragging = true;
      startX = e.touches[0].pageX - lookbookContainer.offsetLeft;
      scrollLeft = lookbookContainer.scrollLeft;
      e.preventDefault();
    });
    
    lookbookContainer.addEventListener('touchmove', function(e) {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.touches[0].pageX - lookbookContainer.offsetLeft;
      const walk = (x - startX) * 0.8; // スクロール感度をさらに調整（1から0.8に変更）
      lookbookContainer.scrollLeft = scrollLeft - walk;
    });
    
    lookbookContainer.addEventListener('touchend', function() {
      if (isDragging) {
        isDragging = false;
      }
    });
    
    // マウスイベント（PC用）
    lookbookContainer.addEventListener('mousedown', function(e) {
      isDragging = true;
      startX = e.pageX - lookbookContainer.offsetLeft;
      scrollLeft = lookbookContainer.scrollLeft;
      lookbookContainer.style.cursor = 'grabbing';
      e.preventDefault();
    });
    
    lookbookContainer.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - lookbookContainer.offsetLeft;
      const walk = (x - startX) * 0.8; // スクロール感度をさらに調整（1から0.8に変更）
      lookbookContainer.scrollLeft = scrollLeft - walk;
    });
    
    lookbookContainer.addEventListener('mouseup', function() {
      if (isDragging) {
        isDragging = false;
        lookbookContainer.style.cursor = 'grab';
      }
    });
    
    lookbookContainer.addEventListener('mouseleave', function() {
      if (isDragging) {
        isDragging = false;
        lookbookContainer.style.cursor = 'grab';
      }
    });
    
    // スクロール範囲の調整
    lookbookContainer.addEventListener('scroll', function() {
      // スクロール位置を制限して左から右へのスクロールを可能にする
      if (lookbookContainer.scrollLeft < 0) {
        lookbookContainer.scrollLeft = 0;
      }
    });
  }
}

// スマートフォン表示での画像表示を最優先で保証
function ensureMobileImageDisplay() {
  const isMobile = window.innerWidth <= 767;
  
  if (isMobile) {
    console.log('Mobile device detected, applying forced display rules...');
    
    // 1.JPGと25.JPGの画像を最優先で強制表示
    const specialImages = document.querySelectorAll('img[src*="1.JPG"], img[src*="25.JPG"]');
    console.log('Found special images:', specialImages.length);
    
    specialImages.forEach((img, index) => {
      console.log(`Processing image ${index + 1}:`, img.src);
      
      // 画像の表示を最優先で強制（サイズは正常に）
      img.style.setProperty('display', 'block', 'important');
      img.style.setProperty('visibility', 'visible', 'important');
      img.style.setProperty('opacity', '1', 'important');
      img.style.setProperty('width', 'auto', 'important');
      img.style.setProperty('height', 'auto', 'important');
      img.style.setProperty('max-height', '250px', 'important');
      img.style.setProperty('position', 'relative', 'important');
      img.style.setProperty('z-index', '1', 'important');
      img.style.setProperty('pointer-events', 'auto', 'important');
      img.style.setProperty('cursor', 'pointer', 'important');
      img.style.setProperty('transform', 'none', 'important');
      img.style.setProperty('filter', 'none', 'important');
      img.style.setProperty('clip', 'auto', 'important');
      img.style.setProperty('clip-path', 'none', 'important');
      
      console.log(`Image ${index + 1} styles applied:`, img.style.cssText);
    });
    
    // 1.JPGと25.JPGのリンクを最優先で強制表示（サイズは正常に）
    const specialLinks = document.querySelectorAll('a[href*="68a3416c225fded5de0dfb82"], a[href*="68a346549b5b820cfb8b08f5"]');
    console.log('Found special links:', specialLinks.length);
    
    specialLinks.forEach((link, index) => {
      console.log(`Processing link ${index + 1}:`, link.href);
      
      // リンクの表示を最優先で強制（サイズは正常に）
      link.style.setProperty('display', 'inline-block', 'important');
      link.style.setProperty('visibility', 'visible', 'important');
      link.style.setProperty('opacity', '1', 'important');
      link.style.setProperty('position', 'relative', 'important');
      link.style.setProperty('z-index', '1', 'important');
      link.style.setProperty('pointer-events', 'auto', 'important');
      link.style.setProperty('cursor', 'pointer', 'important');
      link.style.setProperty('transform', 'none', 'important');
      link.style.setProperty('filter', 'none', 'important');
      link.style.setProperty('clip', 'auto', 'important');
      link.style.setProperty('clip-path', 'none', 'important');
      
      console.log(`Link ${index + 1} styles applied:`, link.style.cssText);
    });
    
    // flowing imagesセクション全体の表示保証
    const flowingSection = document.getElementById('flowing-images') || document.querySelector('.section-flowing');
    if (flowingSection) {
      flowingSection.style.setProperty('display', 'block', 'important');
      flowingSection.style.setProperty('visibility', 'visible', 'important');
      flowingSection.style.setProperty('opacity', '1', 'important');
      flowingSection.style.setProperty('overflow', 'visible', 'important');
      console.log('Flowing section styles applied');
    }
    
    // flow-trackの表示保証（スクロール機能を維持）
    const flowTracks = document.querySelectorAll('.flow-track');
    flowTracks.forEach((track, index) => {
      track.style.setProperty('display', 'flex', 'important');
      track.style.setProperty('visibility', 'visible', 'important');
      track.style.setProperty('opacity', '1', 'important');
      track.style.setProperty('overflow', 'visible', 'important');
      // スクロール機能を維持
      track.style.setProperty('touch-action', 'pan-x', 'important');
      track.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important');
      console.log(`Flow track ${index + 1} styles applied`);
    });
    
    console.log('Mobile image display rules applied successfully');
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOMContentLoaded event fired');
  ensureFlowingHeight();
  ensureLinkFunctionality();
  ensureBrandHoverEffect();
  ensureLookbookFunctionality();
  ensureMobileImageDisplay();
});

// 画像読み込み完了後にも実行
window.addEventListener('load', function() {
  console.log('Load event fired');
  ensureFlowingHeight();
  ensureLinkFunctionality();
  ensureBrandHoverEffect();
  ensureLookbookFunctionality();
  ensureMobileImageDisplay();
});

// リサイズ時にも実行
window.addEventListener('resize', function() {
  console.log('Resize event fired');
  ensureFlowingHeight();
  ensureMobileImageDisplay();
});

// 即座に実行（保険）
setTimeout(function() {
  console.log('Timeout function executed');
  ensureMobileImageDisplay();
}, 1000); 
