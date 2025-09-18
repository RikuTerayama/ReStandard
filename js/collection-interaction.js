// Collection スワイプ & リンクタップ共存機能（Senior FE仕様）
document.addEventListener('DOMContentLoaded', function() {
  
  // 重複防止ガード
  if (!window.__collectionDoubled) {
    window.__collectionDoubled = true;
    
    document.querySelectorAll('.collection-scroll-top, .collection-scroll-bottom').forEach(track => {
      const items = Array.from(track.children);
      
      // すでに複製済みならスキップ
      const alreadyDoubled = items.some(el => el.dataset?.cloned === '1');
      if (alreadyDoubled) return;
      
      items.forEach(node => {
        const clone = node.cloneNode(true);
        clone.dataset.cloned = '1';
        track.appendChild(clone);
      });
    });
  }
  
  // 二段同時表示の確認
  const collectionTop = document.querySelector('.collection-scroll-top');
  const collectionBottom = document.querySelector('.collection-scroll-bottom');
  
  if (collectionTop && collectionBottom) {
    console.info('[COLLECTION] 二段同時表示確認: OK');
    
    // インライン固定指定の強制削除（高さ・サイズ変更無効化）
    [collectionTop, collectionBottom].forEach(track => {
      const row = track.closest('.collection-row');
      if (row) {
        // 表示関連
        row.style.removeProperty('display');
        row.style.removeProperty('visibility');
        row.style.removeProperty('opacity');
        row.style.removeProperty('position');
        // サイズ関連削除（CSS変数に委ねる）
        row.style.removeProperty('height');
        row.style.removeProperty('width');
        row.style.removeProperty('background');
        row.style.display = '';
        row.style.visibility = '';
        row.style.opacity = '';
        row.style.height = '';
        row.style.width = '';
      }
      
      track.style.removeProperty('display');
      track.style.removeProperty('visibility');
      track.style.removeProperty('opacity');
      track.style.removeProperty('height');
      track.style.removeProperty('width');
      track.style.display = '';
      track.style.visibility = '';
      track.style.opacity = '';
      track.style.height = '';
      track.style.width = '';
      
      // 画像のサイズ固定も削除
      const images = track.querySelectorAll('img');
      images.forEach(img => {
        img.style.removeProperty('height');
        img.style.removeProperty('width');
        img.style.removeProperty('object-fit');
        img.style.height = '';
        img.style.width = '';
        img.style.objectFit = '';
      });
    });
  } else {
    console.warn('[COLLECTION] 二段のうち片方が見つからない');
  }
  
  // Collection スワイプ & リンクタップ共存機能
  function addCollectionSwipeSupport(container) {
    if (!container) return;
    
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let totalDeltaX = 0;
    let animationPaused = false;
    const DRAG_THRESHOLD = 8; // 8px以上でドラッグ判定
    
    // タッチイベント（passive: false でpreventDefault可能）
    container.addEventListener('touchstart', (e) => {
      isDragging = true;
      totalDeltaX = 0;
      container.style.cursor = 'grabbing';
      
      // アニメーション一時停止
      container.style.animationPlayState = 'paused';
      animationPaused = true;
      
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      
      // 閾値判定前はpreventDefaultしない（リンククリック温存）
    }, { passive: false });
    
    container.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      
      const clientX = e.touches[0].clientX;
      const deltaX = (clientX - startX) * 1.5;
      totalDeltaX += Math.abs(deltaX);
      
      // 閾値超過後のみpreventDefault & transform更新
      if (totalDeltaX > DRAG_THRESHOLD) {
        e.preventDefault();
        
        const currentTransform = getComputedStyle(container).transform;
        let currentX = 0;
        
        if (currentTransform && currentTransform !== 'none') {
          const matrix = currentTransform.match(/matrix\((.+)\)/);
          if (matrix) {
            currentX = parseFloat(matrix[1].split(',')[4]);
          }
        }
        
        container.style.transform = `translateX(${currentX + deltaX}px)`;
      }
      
      startX = clientX;
    }, { passive: false });
    
    container.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      
      // 閾値以下ならリンククリック許可
      if (totalDeltaX <= DRAG_THRESHOLD) {
        console.info('[COLLECTION] タップ判定: リンク遷移許可');
        // リンククリックを妨げない
      } else {
        console.info('[COLLECTION] ドラッグ判定: リンク遷移防止');
        e.preventDefault();
      }
      
      isDragging = false;
      container.style.cursor = 'grab';
      
      // アニメーション再開
      setTimeout(() => {
        if (animationPaused) {
          container.style.animationPlayState = 'running';
          container.style.transform = '';
          animationPaused = false;
        }
      }, 1500);
    }, { passive: false });
    
    // マウスイベント（PC用・同様のロジック）
    container.addEventListener('mousedown', (e) => {
      isDragging = true;
      totalDeltaX = 0;
      container.style.cursor = 'grabbing';
      
      container.style.animationPlayState = 'paused';
      animationPaused = true;
      
      startX = e.clientX;
      e.preventDefault();
    });
    
    container.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = (e.clientX - startX) * 1.5;
      totalDeltaX += Math.abs(deltaX);
      
      if (totalDeltaX > DRAG_THRESHOLD) {
        const currentTransform = getComputedStyle(container).transform;
        let currentX = 0;
        
        if (currentTransform && currentTransform !== 'none') {
          const matrix = currentTransform.match(/matrix\((.+)\)/);
          if (matrix) {
            currentX = parseFloat(matrix[1].split(',')[4]);
          }
        }
        
        container.style.transform = `translateX(${currentX + deltaX}px)`;
      }
      
      startX = e.clientX;
      e.preventDefault();
    });
    
    container.addEventListener('mouseup', (e) => {
      if (!isDragging) return;
      
      if (totalDeltaX <= DRAG_THRESHOLD) {
        // クリック許可
      } else {
        e.preventDefault();
      }
      
      isDragging = false;
      container.style.cursor = 'grab';
      
      setTimeout(() => {
        if (animationPaused) {
          container.style.animationPlayState = 'running';
          container.style.transform = '';
          animationPaused = false;
        }
      }, 1500);
    });
    
    container.addEventListener('mouseleave', () => {
      if (isDragging) {
        isDragging = false;
        container.style.cursor = 'grab';
        
        setTimeout(() => {
          if (animationPaused) {
            container.style.animationPlayState = 'running';
            container.style.transform = '';
            animationPaused = false;
          }
        }, 1500);
      }
    });
    
    // 基本カーソル設定
    container.style.cursor = 'grab';
    container.style.userSelect = 'none';
  }
  
  // 上下段にスワイプ機能を追加
  addCollectionSwipeSupport(collectionTop);
  addCollectionSwipeSupport(collectionBottom);
  
  // アニメーション継続保証（強制実行）
  setTimeout(() => {
    [collectionTop, collectionBottom].forEach(track => {
      if (track) {
        track.style.animationPlayState = 'running';
      }
    });
  }, 100);
});
