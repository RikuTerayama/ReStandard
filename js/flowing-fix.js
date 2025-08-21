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
    lookbookTrack.style.scrollSnapType = 'none';
    
    // 初期表示位置を調整して2セット目の最初の画像が一番左に表示されるように
    setTimeout(() => {
      const container = lookbookTrack.closest('.lookbook-container');
      if (container) {
        const containerWidth = container.clientWidth;
        const scrollWidth = container.scrollWidth;
        const maxScrollLeft = scrollWidth - containerWidth;
        
        if (maxScrollLeft > 0) {
          // 2セット目の最初の画像が一番左に表示されるように配置
          const targetScrollLeft = maxScrollLeft * 0.5; // 50%の位置に配置（2セット目の開始位置）
          container.scrollLeft = targetScrollLeft;
          
          // 左から右へのスクロールを確実に可能にするための追加設定
          container.style.overflowX = 'auto';
          container.style.scrollBehavior = 'auto';
          container.style.scrollSnapType = 'none';
          container.style.minWidth = 'max-content';
          container.style.width = 'max-content';
          
          // スクロール範囲を拡張
          container.style.scrollPaddingLeft = '0';
          container.style.scrollPaddingRight = '0';
          
          // 左から右へのスクロールを可能にするための追加設定
          container.style.direction = 'ltr';
          container.style.textAlign = 'left';
          
          // 左から右への移動を確実に可能にするための追加設定
          container.style.scrollPadding = '0';
          container.style.scrollSnapType = 'none';
          
          // スクロール範囲を制限しない
          container.style.overflowX = 'auto';
          container.style.overflowY = 'hidden';
        }
      }
    }, 100);
    
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
    
    // 初期表示時に2セット目の最初の画像が一番左に表示されるように配置 - PC以外の全デバイス対応
    setTimeout(() => {
      const containerWidth = lookbookContainer.clientWidth;
      const scrollWidth = lookbookContainer.scrollWidth;
      const maxScrollLeft = scrollWidth - containerWidth;
      
      if (maxScrollLeft > 0) {
        // 1セット目の最初の画像が一番左に表示されるように配置（1,2,3,4,5,6,7,8→1...の順序）
        lookbookContainer.scrollLeft = 0;
        
        // PC以外の全デバイスでの追加対応
        if (lookbookContainer.style.webkitTransform !== undefined) {
          lookbookContainer.style.webkitTransform = 'translate3d(0, 0, 0)';
        }
        if (lookbookContainer.style.transform !== undefined) {
          lookbookContainer.style.transform = 'translate3d(0, 0, 0)';
        }
        
        // 左から右へのスクロールを確実に可能にするための追加設定
        lookbookContainer.style.direction = 'ltr';
        lookbookContainer.style.textAlign = 'left';
        lookbookContainer.style.scrollBehavior = 'auto';
        lookbookContainer.style.scrollSnapType = 'none';
        
        // 自動スクロールのスピードを早める
        lookbookContainer.style.animationDuration = '15s'; // 25sから15sに短縮
        
        // 初期表示位置を2セット目の開始位置に調整
        const itemWidth = 200 + 16; // 画像幅 + gap
        const imagesPerSet = 8;
        setTimeout(() => {
          lookbookContainer.scrollLeft = itemWidth * imagesPerSet; // 2セット目の最初の画像から表示
        }, 100);
        
        // 自動スクロールを確実に動作させるための設定
        lookbookContainer.style.overflow = 'visible';
        // lookbook-trackに対してアニメーションを適用（背景は固定）
        const lookbookTrack = lookbookContainer.querySelector('.lookbook-track');
        if (lookbookTrack) {
          // PC以外ではアニメーションを確実に有効化
          if (window.innerWidth < 1440) {
            // 強制的にアニメーションを設定
            lookbookTrack.style.setProperty('animation', 'lookbook-test 5s linear infinite', 'important');
            lookbookTrack.style.setProperty('animation-play-state', 'running', 'important');
            lookbookTrack.style.setProperty('animation-duration', '5s', 'important');
            lookbookTrack.style.setProperty('animation-timing-function', 'linear', 'important');
            lookbookTrack.style.setProperty('animation-iteration-count', 'infinite', 'important');
            lookbookTrack.style.setProperty('animation-direction', 'normal', 'important');
            lookbookTrack.style.setProperty('animation-delay', '0s', 'important');
            lookbookTrack.style.setProperty('animation-fill-mode', 'both', 'important');
            lookbookTrack.style.setProperty('will-change', 'transform', 'important');
            lookbookTrack.style.setProperty('transform', 'translateX(0)', 'important');
            
            // 個別プロパティも強制設定
            lookbookTrack.style.setProperty('animation-name', 'lookbook-test', 'important');
            lookbookTrack.style.setProperty('animation-duration', '5s', 'important');
            lookbookTrack.style.setProperty('animation-timing-function', 'linear', 'important');
            lookbookTrack.style.setProperty('animation-delay', '0s', 'important');
            lookbookTrack.style.setProperty('animation-iteration-count', 'infinite', 'important');
            lookbookTrack.style.setProperty('animation-direction', 'normal', 'important');
            lookbookTrack.style.setProperty('animation-fill-mode', 'both', 'important');
            lookbookTrack.style.setProperty('animation-play-state', 'running', 'important');
            
            // コンテナの設定も強制適用
            lookbookContainer.style.setProperty('overflow', 'hidden', 'important');
            lookbookContainer.style.setProperty('overflow-x', 'hidden', 'important');
            lookbookContainer.style.setProperty('overflow-y', 'hidden', 'important');
            lookbookContainer.style.setProperty('position', 'relative', 'important');
            
            // アニメーションの動作確認
            setTimeout(() => {
              const computedStyle = getComputedStyle(lookbookTrack);
              console.log('アニメーション設定後の状態:');
              console.log('- animation:', computedStyle.animation);
              console.log('- transform:', computedStyle.transform);
              console.log('- will-change:', computedStyle.willChange);
              console.log('- overflow:', getComputedStyle(lookbookContainer).overflow);
              console.log('- animation-fill-mode:', computedStyle.animationFillMode);
              console.log('- animation-name:', computedStyle.animationName);
              console.log('- animation-duration:', computedStyle.animationDuration);
              
              // アニメーションが実際に動作しているかテスト
              if (computedStyle.animation.includes('lookbook-test')) {
                console.log('✅ テストアニメーションが正しく設定されました');
                console.log('✅ animation-fill-mode:', computedStyle.animationFillMode);
                console.log('✅ animation-name:', computedStyle.animationName);
                
                // アニメーションの動作テスト
                console.log('アニメーション開始位置:', computedStyle.transform);
                
                // 5秒後に位置を確認
                setTimeout(() => {
                  const newStyle = getComputedStyle(lookbookTrack);
                  console.log('5秒後の位置:', newStyle.transform);
                  console.log('位置が変わったか:', computedStyle.transform !== newStyle.transform);
                  
                  if (computedStyle.transform !== newStyle.transform) {
                    console.log('🎉 アニメーションが動作しています！');
                  } else {
                    console.log('❌ アニメーションが動作していません');
                    console.log('現在のアニメーション設定:', newStyle.animation);
                    console.log('現在のanimation-fill-mode:', newStyle.animationFillMode);
                  }
                }, 5000);
              } else {
                console.log('❌ テストアニメーションが設定されていません');
              }
            }, 100);
            
            console.log('PC未満の画面サイズでLookbookテストアニメーションを適用しました');
            console.log('overflow設定:', lookbookContainer.style.overflow);
            console.log('overflow-x設定:', lookbookContainer.style.overflowX);
            console.log('overflow-y設定:', lookbookContainer.style.overflowY);
          }
          // 画像の順序を正しく設定
          lookbookTrack.style.flexWrap = 'nowrap';
          lookbookTrack.style.minWidth = 'max-content';
        }
      }
    }, 200); // タイミングをさらに遅らせて確実に動作するように
    
    // 左から右へのスクロールを可能にする
    lookbookContainer.style.minWidth = '100%';
    lookbookContainer.style.justifyContent = 'flex-start';
    
    // スクロール挙動を改善
    lookbookContainer.style.position = 'relative';
    lookbookContainer.style.willChange = 'scroll-position';
    lookbookContainer.style.userSelect = 'none';
    lookbookContainer.style.webkitUserSelect = 'none';
    lookbookContainer.style.mozUserSelect = 'none';
    lookbookContainer.style.msUserSelect = 'none';
    lookbookContainer.style.scrollSnapType = 'none';
    
    // PC以外の全デバイス対応
    lookbookContainer.style.webkitTransform = 'translateZ(0)';
    lookbookContainer.style.transform = 'translateZ(0)';
    lookbookContainer.style.webkitBackfaceVisibility = 'hidden';
    lookbookContainer.style.backfaceVisibility = 'hidden';
    
    // タッチデバイス専用の設定
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      lookbookContainer.style.webkitOverflowScrolling = 'touch';
      lookbookContainer.style.touchAction = 'pan-x';
    }
    
    // スワイプ機能の実装
    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;
    
    // タッチイベント
    lookbookContainer.addEventListener('touchstart', (e) => {
      startX = e.touches[0].pageX - lookbookContainer.offsetLeft;
      scrollLeft = lookbookContainer.scrollLeft;
    });
    
    lookbookContainer.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!startX) return;
      const x = e.touches[0].pageX - lookbookContainer.offsetLeft;
      const walk = (x - startX) * 2;
      lookbookContainer.scrollLeft = scrollLeft - walk;
    });
    
    lookbookContainer.addEventListener('touchend', () => {
      startX = 0;
    });
    
    // 画像ナンバーの更新と矢印の機能
    updateImageCounter();
    setupNavigationArrows();
  }
  
  // 画像カウンターの更新
  function updateImageCounter() {
    const lookbookContainer = document.querySelector('.lookbook-container');
    const imageCounter = document.querySelector('.image-counter');
    
    if (!lookbookContainer || !imageCounter) return;
    
    // スクロール位置に基づいて現在の画像番号を計算
    const updateCounter = () => {
      const scrollLeft = lookbookContainer.scrollLeft;
      const itemWidth = 200 + 16; // 画像幅 + gap
      const currentIndex = Math.round(scrollLeft / itemWidth) % 8;
      const imageNumber = currentIndex + 1;
      imageCounter.textContent = `${imageNumber}/8`;
    };
    
    // スクロール時にカウンターを更新
    lookbookContainer.addEventListener('scroll', updateCounter);
    
    // 初期値を設定
    updateCounter();
  }
  
  // 矢印ナビゲーションの設定
  function setupNavigationArrows() {
    const leftArrow = document.querySelector('.nav-arrow.left-arrow');
    const rightArrow = document.querySelector('.nav-arrow.right-arrow');
    const lookbookContainer = document.querySelector('.lookbook-container');
    
    if (!leftArrow || !rightArrow || !lookbookContainer) return;
    
    const itemWidth = 200 + 16; // 画像幅 + gap
    
    // 左矢印クリック
    leftArrow.addEventListener('click', () => {
      const currentScroll = lookbookContainer.scrollLeft;
      const newScroll = Math.max(0, currentScroll - itemWidth);
      lookbookContainer.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    });
    
    // 右矢印クリック
    rightArrow.addEventListener('click', () => {
      const currentScroll = lookbookContainer.scrollLeft;
      const maxScroll = lookbookContainer.scrollWidth - lookbookContainer.clientWidth;
      const newScroll = Math.min(maxScroll, currentScroll + itemWidth);
      lookbookContainer.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
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
  console.log('画面幅:', window.innerWidth);
  console.log('PC未満判定:', window.innerWidth < 1440 ? 'はい' : 'いいえ');
  
  // Lookbook要素の存在確認
  const lookbookContainer = document.querySelector('.lookbook-container');
  const lookbookTrack = document.querySelector('.lookbook-track');
  console.log('lookbook-container見つかった:', !!lookbookContainer);
  console.log('lookbook-track見つかった:', !!lookbookTrack);
  
  if (lookbookTrack && window.innerWidth < 1440) {
    console.log('lookbook-trackのアニメーション状態:', getComputedStyle(lookbookTrack).animation);
  }
  
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
