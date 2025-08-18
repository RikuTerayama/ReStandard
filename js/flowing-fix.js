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
  
  if (lookbookTrack) {
    // アニメーションが正しく動作するように保証
    lookbookTrack.style.animation = 'lookbook-scroll 30s linear infinite';
    
    // ホバー時の一時停止機能を保証
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
}

// スマートフォン表示での画像表示保証
function ensureMobileImageDisplay() {
  const isMobile = window.innerWidth <= 767;
  
  if (isMobile) {
    // flowing imagesの画像表示保証
    const flowingImages = document.querySelectorAll('#flowing-images .flow-track a img, .section-flowing .flow-track a img');
    flowingImages.forEach(img => {
      img.style.display = 'block';
      img.style.visibility = 'visible';
      img.style.opacity = '1';
      img.style.position = 'relative';
      img.style.zIndex = '1';
      img.style.pointerEvents = 'auto';
      img.style.cursor = 'pointer';
    });
    
    // flowing imagesのリンク表示保証
    const flowingLinks = document.querySelectorAll('#flowing-images .flow-track a, .section-flowing .flow-track a');
    flowingLinks.forEach(link => {
      link.style.display = 'inline-block';
      link.style.visibility = 'visible';
      link.style.opacity = '1';
      link.style.pointerEvents = 'auto';
      link.style.cursor = 'pointer';
      link.style.position = 'relative';
      link.style.zIndex = '1';
    });
    
    // 1.JPGと25.JPGの強制表示
    const specialImages = document.querySelectorAll('#flowing-images .flow-track a img[src*="1.JPG"], #flowing-images .flow-track a img[src*="25.JPG"], .section-flowing .flow-track a img[src*="1.JPG"], .section-flowing .flow-track a img[src*="25.JPG"]');
    specialImages.forEach(img => {
      img.style.display = 'block';
      img.style.visibility = 'visible';
      img.style.opacity = '1';
      img.style.zIndex = '999';
      img.style.background = 'rgba(255, 0, 0, 0.1)';
      img.style.pointerEvents = 'auto';
      img.style.cursor = 'pointer';
    });
    
    // 1.JPGと25.JPGのリンク強制表示
    const specialLinks = document.querySelectorAll('#flowing-images .flow-track a[href*="68a3416c225fded5de0dfb82"], #flowing-images .flow-track a[href*="68a346549b5b820cfb8b08f5"], .section-flowing .flow-track a[href*="68a3416c225fded5de0dfb82"], .section-flowing .flow-track a[href*="68a346549b5b820cfb8b08f5"]');
    specialLinks.forEach(link => {
      link.style.display = 'inline-block';
      link.style.visibility = 'visible';
      link.style.opacity = '1';
      link.style.zIndex = '999';
      link.style.background = 'rgba(0, 255, 0, 0.1)';
      link.style.pointerEvents = 'auto';
      link.style.cursor = 'pointer';
    });
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
  ensureFlowingHeight();
  ensureLinkFunctionality();
  ensureBrandHoverEffect();
  ensureLookbookFunctionality();
  ensureMobileImageDisplay();
});

// 画像読み込み完了後にも実行
window.addEventListener('load', function() {
  ensureFlowingHeight();
  ensureLinkFunctionality();
  ensureBrandHoverEffect();
  ensureLookbookFunctionality();
  ensureMobileImageDisplay();
});

// リサイズ時にも実行
window.addEventListener('resize', function() {
  ensureFlowingHeight();
  ensureMobileImageDisplay();
}); 
