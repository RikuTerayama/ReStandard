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
      
      // 画像の表示を最優先で強制
      img.style.setProperty('display', 'block', 'important');
      img.style.setProperty('visibility', 'visible', 'important');
      img.style.setProperty('opacity', '1', 'important');
      img.style.setProperty('width', 'auto', 'important');
      img.style.setProperty('height', 'auto', 'important');
      img.style.setProperty('max-height', '250px', 'important');
      img.style.setProperty('position', 'relative', 'important');
      img.style.setProperty('z-index', '999', 'important');
      img.style.setProperty('background', 'rgba(255, 0, 0, 0.3)', 'important');
      img.style.setProperty('pointer-events', 'auto', 'important');
      img.style.setProperty('cursor', 'pointer', 'important');
      img.style.setProperty('transform', 'none', 'important');
      img.style.setProperty('filter', 'none', 'important');
      img.style.setProperty('clip', 'auto', 'important');
      img.style.setProperty('clip-path', 'none', 'important');
      img.style.setProperty('min-width', '50px', 'important');
      img.style.setProperty('min-height', '50px', 'important');
      img.style.setProperty('border', '2px solid red', 'important');
      
      console.log(`Image ${index + 1} styles applied:`, img.style.cssText);
    });
    
    // 1.JPGと25.JPGのリンクを最優先で強制表示
    const specialLinks = document.querySelectorAll('a[href*="68a3416c225fded5de0dfb82"], a[href*="68a346549b5b820cfb8b08f5"]');
    console.log('Found special links:', specialLinks.length);
    
    specialLinks.forEach((link, index) => {
      console.log(`Processing link ${index + 1}:`, link.href);
      
      // リンクの表示を最優先で強制
      link.style.setProperty('display', 'inline-block', 'important');
      link.style.setProperty('visibility', 'visible', 'important');
      link.style.setProperty('opacity', '1', 'important');
      link.style.setProperty('position', 'relative', 'important');
      link.style.setProperty('z-index', '999', 'important');
      link.style.setProperty('background', 'rgba(0, 255, 0, 0.3)', 'important');
      link.style.setProperty('pointer-events', 'auto', 'important');
      link.style.setProperty('cursor', 'pointer', 'important');
      link.style.setProperty('transform', 'none', 'important');
      link.style.setProperty('filter', 'none', 'important');
      link.style.setProperty('clip', 'auto', 'important');
      link.style.setProperty('clip-path', 'none', 'important');
      link.style.setProperty('min-width', '50px', 'important');
      link.style.setProperty('min-height', '50px', 'important');
      link.style.setProperty('border', '2px solid green', 'important');
      
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
    
    // flow-trackの表示保証
    const flowTracks = document.querySelectorAll('.flow-track');
    flowTracks.forEach((track, index) => {
      track.style.setProperty('display', 'flex', 'important');
      track.style.setProperty('visibility', 'visible', 'important');
      track.style.setProperty('opacity', '1', 'important');
      track.style.setProperty('overflow', 'visible', 'important');
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
